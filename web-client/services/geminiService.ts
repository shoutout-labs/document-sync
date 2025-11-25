
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { RagStore, QueryResult, Document } from '../types';

let manualApiKey: string | null = null;

export function setApiKey(apiKey: string | null): void {
    manualApiKey = apiKey;
}

function getAiClient(): GoogleGenAI {
    const apiKey = manualApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set. Please provide it via environment variable or enter it manually.');
    }
    return new GoogleGenAI({ apiKey });
}

export function initialize() {
    // No-op: API client is initialized per request to ensure latest API key is used.
}

async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createRagStore(displayName: string): Promise<string> {
    const ai = getAiClient();
    const ragStore = await ai.fileSearchStores.create({ config: { displayName } });
    if (!ragStore.name) {
        throw new Error("Failed to create RAG store: name is missing.");
    }
    return ragStore.name;
}

export async function uploadToRagStore(ragStoreName: string, file: File): Promise<void> {
    const ai = getAiClient();
    
    let op = await ai.fileSearchStores.uploadToFileSearchStore({
        fileSearchStoreName: ragStoreName,
        file: file
    });

    while (!op.done) {
        await delay(3000);
        op = await ai.operations.get({operation: op});
    }
}

export async function fileSearch(ragStoreName: string, query: string): Promise<QueryResult> {
    const ai = getAiClient();

    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: query + "DO NOT ASK THE USER TO READ THE MANUAL, pinpoint the relevant sections in the response itself.",
                config: {
                    tools: [
                            {
                                fileSearch: {
                                    fileSearchStoreNames: [ragStoreName],
                                }
                            }
                        ]
                }
            });

            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            return {
                text: response.text || "No response generated.",
                groundingChunks: groundingChunks,
            };
        } catch (error: any) {
            const isQuotaError = error.status === 429 || 
                                 error.code === 429 || 
                                 (error.message && error.message.includes('RESOURCE_EXHAUSTED'));
            
            if (attempt < maxRetries && isQuotaError) {
                 const delayMs = Math.pow(2, attempt) * 1000;
                 console.warn(`Error during file search (Attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms...`, error.message);
                 await delay(delayMs);
                 continue;
            }
            
            throw error;
        }
    }
    throw new Error("Failed to search file store after multiple attempts.");
}

export async function generateExampleQuestions(ragStoreName: string): Promise<string[]> {
    const ai = getAiClient();
    
    const fallbackQuestions = [
        "What is this document about?",
        "Summarize the key points.",
        "What are the important details?",
        "Can you explain the main concepts?"
    ];

    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: "You are provided some user manuals for some products. Figure out for what product each manual is for, based on the cover page contents. DO NOT GUESS OR HALLUCINATE THE PRODUCT. Then, for each product, generate 4 short and practical example questions a user might ask about it in English. Return the questions as a JSON array of objects. Each object should have a 'product' key with the product name as a string, and a 'questions' key with an array of 4 question strings. For example: ```json[{\"product\": \"Product A\", \"questions\": [\"q1\", \"q2\"]}, {\"product\": \"Product B\", \"questions\": [\"q3\", \"q4\"]}]```",
                config: {
                    tools: [
                        {
                            fileSearch: {
                                fileSearchStoreNames: [ragStoreName],
                            }
                        }
                    ]
                }
            });
            
            let jsonText = response.text?.trim() || "";

            const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
                jsonText = jsonMatch[1];
            } else {
                const firstBracket = jsonText.indexOf('[');
                const lastBracket = jsonText.lastIndexOf(']');
                if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                    jsonText = jsonText.substring(firstBracket, lastBracket + 1);
                }
            }
            
            let parsedData;
            try {
                parsedData = JSON.parse(jsonText);
            } catch (e) {
                // Force a retry on JSON parse error if we haven't exhausted retries
                throw new Error("JSON Parse Error");
            }
            
            if (Array.isArray(parsedData)) {
                if (parsedData.length === 0) return fallbackQuestions;
                const firstItem = parsedData[0];

                // Handle new format: array of {product, questions[]}
                if (typeof firstItem === 'object' && firstItem !== null && 'questions' in firstItem && Array.isArray(firstItem.questions)) {
                    return parsedData.flatMap(item => (item.questions || [])).filter(q => typeof q === 'string');
                }
                
                // Handle old format: array of strings
                if (typeof firstItem === 'string') {
                    return parsedData.filter(q => typeof q === 'string');
                }
            }
            
            console.warn("Received unexpected format for example questions:", parsedData);
            return fallbackQuestions;

        } catch (error: any) {
            const isQuotaError = error.status === 429 || 
                                 error.code === 429 || 
                                 (error.message && error.message.includes('RESOURCE_EXHAUSTED'));
            
            if (attempt < maxRetries) {
                 const delayMs = isQuotaError ? Math.pow(2, attempt) * 1000 : 1000;
                 console.warn(`Error generating examples (Attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms...`, error.message);
                 await delay(delayMs);
                 continue;
            }
            
            console.warn("Failed to generate example questions after retries. Using fallbacks.", error);
            return fallbackQuestions;
        }
    }
    return fallbackQuestions;
}


export async function deleteRagStore(ragStoreName: string): Promise<void> {
    const ai = getAiClient();
    const maxRetries = 5; // Retry deletion of the store itself if it claims to be non-empty

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Step 1: Aggressively delete all files
            while (true) {
                // Use listDocuments but be aware it might return [] on error, so we rely on the loop breaking naturally
                const docs = await listDocuments(ragStoreName);
                if (docs.length === 0) {
                    break;
                }

                // Delete in chunks to manage concurrency
                const chunkSize = 10;
                for (let i = 0; i < docs.length; i += chunkSize) {
                    const chunk = docs.slice(i, i + chunkSize);
                    await Promise.all(chunk.map(async (doc) => {
                        try {
                            await deleteDocument(doc.name);
                        } catch (e: any) {
                            // If 404, it's already deleted, which is fine.
                            if (e.status !== 404 && e.code !== 404) {
                                console.warn(`Failed to delete document ${doc.name}`, e);
                            }
                        }
                    }));
                    // Small delay between chunks
                    await delay(200);
                }

                // If we got fewer than 100 docs, we likely cleared the current page.
                // However, due to consistency, we loop again to be sure.
                if (docs.length < 100) {
                    // One final check after a short delay to ensure consistency
                    await delay(1000);
                    const check = await listDocuments(ragStoreName);
                    if (check.length === 0) break;
                }
            }
            
            // Step 2: Try to delete the store
            await ai.fileSearchStores.delete({
                name: ragStoreName
            });
            
            return; // Success
            
        } catch (error: any) {
            const isNonEmptyError = error.status === 400 || error.code === 400 || (error.message && error.message.includes('non-empty'));
            
            if (isNonEmptyError && attempt < maxRetries - 1) {
                console.warn(`Store deletion failed (Attempt ${attempt + 1}/${maxRetries}) because it is not empty. Retrying cleanup...`);
                await delay(2000); // Wait for backend consistency
                continue;
            }
            
            throw error;
        }
    }
}

export async function listRagStores(): Promise<RagStore[]> {
    const ai = getAiClient();
    try {
        const response = await ai.fileSearchStores.list();
        // Map the response to our RagStore interface, including activeDocumentsCount
        return response?.page?.map((store: any) => ({
            displayName: store.displayName,
            name: store.name,
            activeDocumentsCount: store.activeDocumentsCount
        })) || [];
    } catch (error) {
        console.error("Error listing RAG stores:", error);
        return [];
    }
}

export async function listDocuments(ragStoreName: string): Promise<Document[]> {
    const ai = getAiClient();
    try {
        // We use 'parent' as the parameter name which is standard for Google APIs to list sub-resources.
        // We also check for 'documents' in the response as that is the standard API field for the list.
        const response = await ai.fileSearchStores.documents.list({
            parent: ragStoreName,
            pageSize: 100
        } as any);

        const docs = (response as any).documents || (response as any).page || [];
        
        return docs.map((doc: any) => ({
            name: doc.name,
            // Fallback: If displayName is missing, use the last part of the resource name (the ID) or the full name.
            displayName: doc.displayName || doc.name.split('/').pop() || doc.name,
            customMetadata: doc.customMetadata
        }));
    } catch (error) {
        console.error("Error listing documents:", error);
        return [];
    }
}

export async function deleteDocument(documentName: string): Promise<void> {
    const ai = getAiClient();
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.debug("Deleting:",documentName);
            // Delete a File Search store
await ai.fileSearchStores.delete({
  name: documentName,
  config: { force: true }
});
          
            return;
        } catch (error: any) {
            // If already deleted (404), return success
            if (error.status === 404 || error.code === 404) {
                return;
            }

            const isQuotaError = error.status === 429 || error.code === 429;
            if (isQuotaError && attempt < maxRetries - 1) {
                const delayMs = Math.pow(2, attempt + 1) * 1000;
                console.warn(`Rate limit hitting during document deletion. Retrying in ${delayMs}ms...`);
                await delay(delayMs);
                continue;
            }
            
            throw error;
        }
    }
}
