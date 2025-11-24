import { GoogleGenAI } from '@google/genai';

export class GeminiService {
    private ai: any; // Using any because @google/genai types might be tricky or not fully exposed yet

    constructor(apiKey: string) {
        this.ai = new GoogleGenAI({ apiKey });
    }

    async getOrCreateFileSearchStore(displayName: string): Promise<string> {
        try {
            // List existing stores to check if one with the display name exists
            let existingStoreId: string | undefined;
            try {
                const listResult = await this.ai.fileSearchStores.list();
                
                // Iterate over the async iterable (similar to listFileStores)
                for await (const store of listResult) {
                    if (store.displayName === displayName) {
                        existingStoreId = store.name;
                        break;
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

    async listDocuments(storeName: string): Promise<Array<{ name: string; displayName?: string }>> {
        try {
            const documents: Array<{ name: string; displayName?: string }> = [];
            const documentsResult = await this.ai.fileSearchStores.documents.list({
                parent: storeName
            });

            for await (const doc of documentsResult) {
                if (doc.name) {
                    documents.push({
                        name: doc.name,
                        displayName: doc.displayName
                    });
                }
            }

            return documents;
        } catch (error: any) {
            throw new Error(`Failed to list documents: ${error.message || error}`);
        }
    }

    async deleteDocument(documentName: string): Promise<void> {
        try {
            await this.ai.fileSearchStores.documents.delete({
                name: documentName,
                config: { force: true }
            });
        } catch (error: any) {
            throw new Error(`Failed to delete document ${documentName}: ${error.message || error}`);
        }
    }

    async listFileStores(): Promise<string[]> {
        try {
            const listResult = await this.ai.fileSearchStores.list();
            const projects = new Set<string>();

            // Iterate over the Pager
            for await (const store of listResult) {
                if (store.displayName) {
                    projects.add(store.displayName);
                }
            }

            return Array.from(projects).sort();
        } catch (error: any) {
            console.warn("Failed to list file search stores:", error);
            return [];
        }
    }
}
