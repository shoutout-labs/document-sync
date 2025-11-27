#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { askProject, listProjects } from "./gemini.js";

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
            {
                name: "list_projects",
                description:
                    "List all available Gemini File Search projects (File Search stores) for the current GEMINI_API_KEY.",
                inputSchema: {
                    type: "object",
                    properties: {},
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

    if (request.params.name === "list_projects") {
        try {
            const projects = await listProjects();
            if (projects.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "No projects found for the current GEMINI_API_KEY.",
                        },
                    ],
                };
            }

            const projectList = projects.map((project) => `- ${project}`).join("\n");
            return {
                content: [
                    {
                        type: "text",
                        text: `Available projects:\n${projectList}`,
                    },
                ],
            };
        } catch (error: any) {
            return {
                content: [
                    {
                        type: "text",
                        text: error.message ?? "Unexpected error listing projects.",
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
