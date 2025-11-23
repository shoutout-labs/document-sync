import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("Error: GEMINI_API_KEY environment variable is required.");
    process.exit(1);
}

// Initialize GoogleGenAI client
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- Settings Helper ---
interface GeminiSettings {
    projectName?: string;
    watchLocation?: string;
}

export function getProjectName(): string | undefined {
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

function parseSettings(filePath: string): string | undefined {
    try {
        const content = fs.readFileSync(filePath, "utf-8");
        const settings = JSON.parse(content) as GeminiSettings;
        return settings.projectName;
    } catch (error) {
        console.error(`Failed to parse ${filePath}:`, error);
        return undefined;
    }
}

export async function listProjects(): Promise<string[]> {
    try {
        const listResult = await ai.fileSearchStores.list();
        const projects = new Set<string>();

        // Iterate over the Pager
        for await (const store of listResult) {
            if (store.displayName) {
                projects.add(store.displayName);
            }
        }

        return Array.from(projects).sort();
    } catch (error) {
        console.error("Error listing projects:", error);
        return [];
    }
}

export async function askProject(query: string, projectName?: string): Promise<string> {
    if (!projectName) {
        projectName = getProjectName();
    }

    if (!projectName) {
        throw new Error("Could not determine 'projectName'. Please provide it as an argument, or ensure 'document-sync.json' exists in the project root.");
    }

    try {
        // 1. Find the File Search Store by display name
        const listResult = await ai.fileSearchStores.list();
        let storeName: string | undefined;

        for await (const store of listResult) {
            if (store.displayName === projectName) {
                storeName = store.name;
                break;
            }
        }

        if (!storeName) {
            return `No File Store found for project '${projectName}'. Please ensure you have synced your files using the VS Code extension.`;
        }

        // 2. Generate Content using the File Store
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: query,
            config: {
                tools: [
                    {
                        fileSearch: {
                            fileSearchStoreNames: [storeName]
                        }
                    }
                ]
            }
        });

        return response.text || "No response generated.";

    } catch (error: any) {
        throw new Error(`Error querying Gemini: ${error.message || error}`);
    }
}
