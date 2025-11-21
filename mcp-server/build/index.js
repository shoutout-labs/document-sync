#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("Error: GEMINI_API_KEY environment variable is required.");
    process.exit(1);
}
const fileManager = new GoogleAIFileManager(API_KEY);
const genAI = new GoogleGenerativeAI(API_KEY);
function getProjectName() {
    let searchDir = process.cwd();
    // If PROJECT_PATH env var is set, start searching from there (or check it directly)
    if (process.env.PROJECT_PATH) {
        const envPath = path.join(process.env.PROJECT_PATH, "document-sync.json");
        if (fs.existsSync(envPath)) {
            return parseSettings(envPath);
        }
        searchDir = process.env.PROJECT_PATH;
    }
    // Recursive search up
    const root = path.parse(searchDir).root;
    while (true) {
        const settingsPath = path.join(searchDir, "document-sync.json");
        if (fs.existsSync(settingsPath)) {
            return parseSettings(settingsPath);
        }
        if (searchDir === root) {
            break;
        }
        searchDir = path.dirname(searchDir);
    }
    return undefined;
}
function parseSettings(filePath) {
    try {
        const content = fs.readFileSync(filePath, "utf-8");
        const settings = JSON.parse(content);
        return settings.projectName;
    }
    catch (error) {
        console.error(`Failed to parse ${filePath}:`, error);
        return undefined;
    }
}
// --- Server Setup ---
const server = new Server({
    name: "gemini-file-search-mcp",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});
// --- Tool Definitions ---
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "ask_project",
                description: "Ask a question about the current project. It uses Gemini File Search to find relevant files uploaded for this project. You should provide the 'projectName' if you know it (e.g. from document-sync.json), otherwise the server will try to auto-detect it.",
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
        let projectName = request.params.arguments?.projectName;
        if (!projectName) {
            projectName = getProjectName();
        }
        if (!projectName) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Error: Could not determine 'projectName'. Please provide it as an argument, or ensure 'document-sync.json' exists in the project root.",
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
            const projectFiles = filesResponse.files.filter((f) => f.displayName && f.displayName.startsWith(projectName + "/"));
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
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const fileParts = projectFiles.map((file) => ({
                fileData: {
                    mimeType: file.mimeType,
                    fileUri: file.uri,
                },
            }));
            const generateWithRetry = async (retries = 3, delay = 1000) => {
                try {
                    return await model.generateContent([
                        ...fileParts,
                        { text: `Answer the following question based on the provided project files: ${query}` },
                    ]);
                }
                catch (error) {
                    if (retries > 0 && (error.message.includes("429") || error.status === 429)) {
                        console.log(`Rate limited. Retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return generateWithRetry(retries - 1, delay * 2);
                    }
                    throw error;
                }
            };
            const result = await generateWithRetry();
            const responseText = result.response.text();
            return {
                content: [
                    {
                        type: "text",
                        text: responseText,
                    },
                ],
            };
        }
        catch (error) {
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
