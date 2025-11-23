#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { askProject, getProjectName } from "./gemini.js";

// --- Server Setup ---
const server = new Server(
    {
        name: "gemini-file-search-mcp",
        version: "0.1.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// --- Tool Definitions ---
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "ask_project",
                description:
                    "Ask a question about the current project. It uses Gemini File Search to find relevant files uploaded for this project. You should provide the 'projectName' if you know it (e.g. from document-sync.json), otherwise the server will try to auto-detect it.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The question or query to ask about the project.",
                        },
                        projectName: {
                            type: "string",
                            description: "The name of the project to search files for. If not provided, the server attempts to find it in document-sync.json.",
                        },
                    },
                    required: ["query"],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "ask_project") {
        const query = String(request.params.arguments?.query);
        let projectName = request.params.arguments?.projectName as string | undefined;

        try {
            const responseText = await askProject(query, projectName);
            return {
                content: [
                    {
                        type: "text",
                        text: responseText,
                    },
                ],
            };
        } catch (error: any) {
            return {
                content: [
                    {
                        type: "text",
                        text: error.message,
                    },
                ],
                isError: true,
            };
        }
    }

    throw new Error("Tool not found");
});

// --- Start Server ---
const transport = new StdioServerTransport();
await server.connect(transport);
