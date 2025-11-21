import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("Error: GEMINI_API_KEY environment variable is required.");
    process.exit(1);
}

const fileManager = new GoogleAIFileManager(API_KEY);
const genAI = new GoogleGenerativeAI(API_KEY);

// --- Settings Helper ---
interface GeminiSettings {
    projectName?: string;
    watchLocation?: string;
}

function getProjectName(): string | undefined {
    // Look for document-sync.json in the current working directory
    const settingsPath = path.join(process.cwd(), "document-sync.json");
    if (fs.existsSync(settingsPath)) {
        try {
            const content = fs.readFileSync(settingsPath, "utf-8");
            const settings = JSON.parse(content) as GeminiSettings;
            return settings.projectName;
        } catch (error) {
            console.error("Failed to parse document-sync.json:", error);
        }
    }
    return undefined;
}

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
                    "Ask a question about the current project. It uses Gemini File Search to find relevant files uploaded for this project.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The question or query to ask about the project.",
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
        const projectName = getProjectName();

        if (!projectName) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Error: Could not find 'projectName' in document-sync.json in the current directory. Please ensure the file exists and has a project name set.",
                    },
                ],
                isError: true,
            };
        }

        try {
            // 1. List files to find those belonging to the project
            // Note: listFiles does not support server-side filtering by displayName prefix efficiently in all versions,
            // but we can filter client-side.
            // Ideally, we would use a more robust search or knowledge base ID if we had one.
            // For this implementation, we will fetch files and filter by displayName.

            const filesResponse = await fileManager.listFiles();
            const projectFiles = filesResponse.files.filter((f) =>
                f.displayName && f.displayName.startsWith(projectName + "/")
            );

            if (projectFiles.length === 0) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `No files found for project '${projectName}'. Please ensure you have synced your files using the VS Code extension.`,
                        },
                    ],
                };
            }

            // 2. Generate Content using the files
            // We will pass the file URIs to the model.
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const fileParts = projectFiles.map((file) => ({
                fileData: {
                    mimeType: file.mimeType,
                    fileUri: file.uri,
                },
            }));

            const result = await model.generateContent([
                ...fileParts,
                { text: `Answer the following question based on the provided project files: ${query}` },
            ]);

            const responseText = result.response.text();

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
                        text: `Error querying Gemini: ${error.message}`,
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
