import { GoogleGenAI } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.warn("VITE_GEMINI_API_KEY environment variable is not set. Please set it in your .env file.");
}

// Initialize GoogleGenAI client
const ai = new GoogleGenAI({ apiKey: API_KEY || "" });

export async function listProjects(): Promise<string[]> {
    if (!API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured. Please set VITE_GEMINI_API_KEY in your .env file.");
    }

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
    } catch (error: any) {
        console.error("Error listing projects:", error);
        throw new Error(`Failed to list projects: ${error.message || error}`);
    }
}

export async function askProject(query: string, projectName: string): Promise<string> {
    if (!API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured. Please set VITE_GEMINI_API_KEY in your .env file.");
    }

    if (!projectName) {
        throw new Error("Project name is required.");
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

export async function deleteProject(projectName: string): Promise<void> {
    if (!API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured. Please set VITE_GEMINI_API_KEY in your .env file.");
    }

    if (!projectName) {
        throw new Error("Project name is required.");
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
            throw new Error(`No File Store found for project '${projectName}'.`);
        }

        // 2. List and delete all documents in the store first
        try {
            const documents = await ai.fileSearchStores.documents.list({
                parent: storeName
            });

            for await (const doc of documents) {
                if (doc.name) {
                    console.log(`Deleting document ${doc.name}`);
                    try {
                        await ai.fileSearchStores.documents.delete({
                            name: doc.name,
                            config: { force: true }
                        });
                    } catch (docError: any) {
                        // Log but continue deleting other documents
                        console.warn(`Failed to delete document ${doc.name}:`, docError);
                    }
                }
            }
        } catch (listError: any) {
            // If listing fails, try to delete with force anyway
            console.warn("Failed to list documents, attempting force delete:", listError);
        }

        // 3. Delete the File Search Store (with force option as fallback)
        await ai.fileSearchStores.delete({
            name: storeName,
            config: { force: true }
        });
    } catch (error: any) {
        throw new Error(`Failed to delete project: ${error.message || error}`);
    }
}

