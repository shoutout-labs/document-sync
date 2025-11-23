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
        const filesResponse = await fileManager.listFiles();
        console.log("filesResponse:", JSON.stringify(filesResponse, null, 2));
        const projects = new Set<string>();

        if (!filesResponse.files) {
            console.log("filesResponse.files is undefined");
            return [];
        }

        for (const file of filesResponse.files) {
            if (file.displayName) {
                const parts = file.displayName.split('/');
                if (parts.length > 1) {
                    projects.add(parts[0]);
                }
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
        // 1. List files to find those belonging to the project
        const filesResponse = await fileManager.listFiles();
        const projectFiles = filesResponse.files.filter((f) =>
            f.displayName && f.displayName.startsWith(projectName + "/")
        );

        if (projectFiles.length === 0) {
            return `No files found for project '${projectName}'. Please ensure you have synced your files using the VS Code extension.`;
        }

        // 2. Generate Content using the files
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const fileParts = projectFiles.map((file) => ({
            fileData: {
                mimeType: file.mimeType,
                fileUri: file.uri,
            },
        }));

        const generateWithRetry = async (retries = 3, delay = 1000): Promise<any> => {
            try {
                return await model.generateContent([
                    ...fileParts,
                    { text: `Answer the following question based on the provided project files: ${query}` },
                ]);
            } catch (error: any) {
                if (retries > 0 && (error.message.includes("429") || error.status === 429)) {
                    console.log(`Rate limited. Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return generateWithRetry(retries - 1, delay * 2);
                }
                throw error;
            }
        };

        const result = await generateWithRetry();
        return result.response.text();

    } catch (error: any) {
        throw new Error(`Error querying Gemini: ${error.message}`);
    }
}
