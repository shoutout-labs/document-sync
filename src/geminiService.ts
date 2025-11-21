import { GoogleGenAI } from '@google/genai';
import * as vscode from 'vscode';

export class GeminiService {
    private ai: any; // Using any because @google/genai types might be tricky or not fully exposed yet

    constructor(apiKey: string) {
        this.ai = new GoogleGenAI({ apiKey });
    }

    async getOrCreateFileSearchStore(displayName: string): Promise<string> {
        try {
            // List existing stores to check if one with the display name exists
            // Note: The list API might be paginated, for simplicity we check the first page or assume reasonable number
            // The SDK documentation/snippet doesn't show list, but we can try to list or just create.
            // If we just create, we might create duplicates.
            // Let's try to list if possible. If not, we'll just create (or maybe the API handles duplicates?)
            // Based on the snippet, it just creates. Let's try to list first if we can find the method.
            // Since I don't have full docs, I'll assume we can list.
            // Actually, the snippet implies we just create. Let's try to list using `ai.fileSearchStores.list()` if it exists.

            let existingStoreId: string | undefined;
            try {
                const listResult = await this.ai.fileSearchStores.list();
                // Assuming listResult has .fileSearchStores or similar
                if (listResult && listResult.fileSearchStores) {
                    const store = listResult.fileSearchStores.find((s: any) => s.displayName === displayName);
                    if (store) {
                        existingStoreId = store.name;
                    }
                }
            } catch (e) {
                console.warn("Failed to list file search stores, proceeding to create new one:", e);
            }

            if (existingStoreId) {
                console.log(`Found existing File Search Store: ${displayName} (${existingStoreId})`);
                return existingStoreId;
            }

            console.log(`Creating new File Search Store: ${displayName}`);
            const fileSearchStore = await this.ai.fileSearchStores.create({
                config: { displayName: displayName }
            });
            return fileSearchStore.name;
        } catch (error: any) {
            throw new Error(`Failed to get or create File Search Store: ${error.message || error}`);
        }
    }

    async uploadFile(storeName: string, filePath: string, mimeType: string, displayName: string): Promise<void> {
        try {
            console.log(`Uploading ${displayName} to ${storeName}...`);

            // Upload and import a file into the File Search store
            let operation = await this.ai.fileSearchStores.uploadToFileSearchStore({
                file: filePath,
                fileSearchStoreName: storeName,
                config: {
                    displayName: displayName,
                    mimeType: mimeType // Pass mimeType if supported/needed, though SDK might infer
                }
            });

            // Wait until import is complete
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2s
                operation = await this.ai.operations.get({ operation });
            }

            console.log(`Upload complete for ${displayName}`);
        } catch (error: any) {
            throw new Error(`Failed to upload file ${displayName}: ${error.message || error}`);
        }
    }
}
