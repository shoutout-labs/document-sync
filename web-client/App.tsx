
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppStatus, ChatMessage, RagStore, Document, CustomMetadata } from './types';
import * as geminiService from './services/geminiService';
import Spinner from './components/Spinner';
import WelcomeScreen from './components/WelcomeScreen';
import ProgressBar from './components/ProgressBar';
import ChatInterface from './components/ChatInterface';
import ConfirmDialog from './components/ConfirmDialog';
import NotificationToast from './components/NotificationToast';

// DO: Define the AIStudio interface to resolve a type conflict where `window.aistudio` was being redeclared with an anonymous type.
// FIX: Moved the AIStudio interface definition inside the `declare global` block to resolve a TypeScript type conflict.
declare global {
    interface AIStudio {
        openSelectKey: () => Promise<void>;
        hasSelectedApiKey: () => Promise<boolean>;
    }
    interface Window {
        aistudio?: AIStudio;
    }
}

const App: React.FC = () => {
    const [status, setStatus] = useState<AppStatus>(AppStatus.Initializing);
    const [isApiKeySelected, setIsApiKeySelected] = useState(false);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number, message?: string, fileName?: string } | null>(null);
    const [activeRagStoreName, setActiveRagStoreName] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isQueryLoading, setIsQueryLoading] = useState(false);
    const [exampleQuestions, setExampleQuestions] = useState<string[]>([]);
    const [documentName, setDocumentName] = useState<string>('');
    const [stores, setStores] = useState<RagStore[]>([]);
    
    // Document Management State (in Chat)
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isDocumentsLoading, setIsDocumentsLoading] = useState(false);
    const [processingFile, setProcessingFile] = useState<string | null>(null);

    // Dialog and Notification State
    const [storeToDelete, setStoreToDelete] = useState<string | null>(null);
    const [docToDelete, setDocToDelete] = useState<string | null>(null);
    const [notification, setNotification] = useState<{message: string, type: 'error' | 'success'} | null>(null);

    const checkApiKey = useCallback(async () => {
        // Check if API key is available from environment variable
        const envApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        if (envApiKey) {
            setIsApiKeySelected(true);
            return;
        }

        // Check if API key is set manually
        try {
            // Try to list stores to verify if API key is working
            await geminiService.listRagStores();
            setIsApiKeySelected(true);
            return;
        } catch (e) {
            // API key not set or invalid
        }

        // Check AI Studio API key if available
        if (window.aistudio?.hasSelectedApiKey) {
            try {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setIsApiKeySelected(hasKey);
            } catch (e) {
                console.error("Error checking for API key:", e);
                setIsApiKeySelected(false);
            }
        } else {
            setIsApiKeySelected(false);
        }
    }, []);

    useEffect(() => {
        const handleVisibilityChange = () => {
            // This event fires when the user switches to or from the tab.
            if (document.visibilityState === 'visible') {
                checkApiKey();
            }
        };
        
        checkApiKey(); // Initial check when the component mounts.

        // Listen for visibility changes and window focus. This ensures that if the user
        // changes the API key in another tab (like the AI Studio settings),
        // the app's state will update automatically when they return to this tab.
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', checkApiKey);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', checkApiKey);
        };
    }, [checkApiKey]);

    const refreshStores = useCallback(async () => {
        if (isApiKeySelected) {
            try {
                const list = await geminiService.listRagStores();
                setStores(list);
            } catch (e) {
                console.error("Failed to list stores", e);
            }
        }
    }, [isApiKeySelected]);

    useEffect(() => {
        if (isApiKeySelected && status === AppStatus.Welcome) {
            refreshStores();
        }
    }, [isApiKeySelected, status, refreshStores]);

    const handleError = (message: string, err: any) => {
        console.error(message, err);
        setError(`${message}${err ? `: ${err instanceof Error ? err.message : String(err)}` : ''}`);
        setStatus(AppStatus.Error);
    };

    const clearError = () => {
        setError(null);
        setStatus(AppStatus.Welcome);
    }

    useEffect(() => {
        setStatus(AppStatus.Welcome);
    }, []);

    const handleSelectKey = async () => {
        if (window.aistudio?.openSelectKey) {
            try {
                await window.aistudio.openSelectKey();
                await checkApiKey(); // Check right after the dialog promise resolves
            } catch (err) {
                console.error("Failed to open API key selection dialog", err);
            }
        } else {
            console.log('window.aistudio.openSelectKey() not available.');
            setNotification({ message: 'API key selection is not available in this environment.', type: 'error' });
        }
    };

    const handleManualApiKeySubmit = useCallback(async (apiKey: string) => {
        try {
            geminiService.setApiKey(apiKey);
            // Verify the API key works by trying to list stores
            await geminiService.listRagStores();
            setIsApiKeySelected(true);
            setApiKeyError(null);
            setNotification({ message: 'API key set successfully.', type: 'success' });
        } catch (err) {
            console.error("Failed to set API key:", err);
            setApiKeyError("Invalid API key. Please check and try again.");
            geminiService.setApiKey(null);
            setIsApiKeySelected(false);
        }
    }, []);

    const fetchDocuments = useCallback(async (storeName: string) => {
        setIsDocumentsLoading(true);
        try {
            const docs = await geminiService.listDocuments(storeName);
            setDocuments(docs);
        } catch (e) {
            console.error("Failed to fetch documents", e);
        } finally {
            setIsDocumentsLoading(false);
        }
    }, []);

    const handleSelectStore = async (store: RagStore) => {
        if (!isApiKeySelected) {
            setApiKeyError("Please select your Gemini API Key first.");
            return;
        }

        try {
            setDocumentName(store.displayName);
            setActiveRagStoreName(store.name);
            setChatHistory([]);
            setExampleQuestions([]); // Reset examples
            setStatus(AppStatus.Chatting);
            
            // Trigger background fetches
            fetchDocuments(store.name);
            geminiService.generateExampleQuestions(store.name)
                .then(setExampleQuestions)
                .catch(e => console.error("Failed to generate example questions in background", e));

        } catch (err) {
            handleError("Failed to load store", err);
        }
    };

    const handleCreateStore = async (displayName: string) => {
        if (!isApiKeySelected) {
            setApiKeyError("Please select your Gemini API Key first.");
            return;
        }
        try {
            await geminiService.createRagStore(displayName);
            setNotification({ message: 'Knowledge base created successfully.', type: 'success' });
            await refreshStores();
        } catch (err) {
            console.error("Failed to create store", err);
            setNotification({ message: 'Failed to create knowledge base.', type: 'error' });
        }
    };

    const handleDeleteStore = async (storeName: string) => {
        setStoreToDelete(storeName);
    };

    const confirmDeleteStore = async () => {
        if (!storeToDelete) return;
        const name = storeToDelete;
        setStoreToDelete(null);

        try {
            await geminiService.deleteRagStore(name);
            setNotification({ message: 'Knowledge base deleted successfully.', type: 'success' });
            await refreshStores();
        } catch (err) {
            console.error("Failed to delete store:", err);
            setNotification({ message: "Failed to delete store. It might have been already deleted.", type: 'error' });
            await refreshStores();
        }
    }

    const handleUploadDocument = async (file: File, metadata: CustomMetadata[]) => {
        if (!activeRagStoreName) return;
        setProcessingFile(file.name);
        try {
            await geminiService.uploadToRagStore(activeRagStoreName, file); 
            await fetchDocuments(activeRagStoreName);
            setNotification({ message: 'Document uploaded successfully.', type: 'success' });
        } catch (e) {
            console.error("Upload failed", e);
            setNotification({ message: 'Failed to upload document.', type: 'error' });
        } finally {
            setProcessingFile(null);
        }
    };

    const handleDeleteDocument = async (docName: string) => {
        setDocToDelete(docName);
    }

    const confirmDeleteDocument = async () => {
        if (!activeRagStoreName || !docToDelete) return;
        const name = docToDelete;
        setDocToDelete(null);

        try {
            await geminiService.deleteDocument(name);
            await fetchDocuments(activeRagStoreName);
            setNotification({ message: 'Document deleted successfully.', type: 'success' });
        } catch (e) {
            console.error("Delete document failed", e);
            setNotification({ message: 'Failed to delete document.', type: 'error' });
        }
    }

    const handleEndChat = () => {
        // We do not delete the RAG store here anymore to support persistent stores.
        setActiveRagStoreName(null);
        setChatHistory([]);
        setExampleQuestions([]);
        setDocumentName('');
        setDocuments([]);
        setStatus(AppStatus.Welcome);
    };

    const handleSendMessage = async (message: string) => {
        if (!activeRagStoreName) return;

        const userMessage: ChatMessage = { role: 'user', parts: [{ text: message }] };
        setChatHistory(prev => [...prev, userMessage]);
        setIsQueryLoading(true);

        try {
            const result = await geminiService.fileSearch(activeRagStoreName, message);
            const modelMessage: ChatMessage = {
                role: 'model',
                parts: [{ text: result.text }],
                groundingChunks: result.groundingChunks
            };
            setChatHistory(prev => [...prev, modelMessage]);
        } catch (err) {
            const errorMessage: ChatMessage = {
                role: 'model',
                parts: [{ text: "Sorry, I encountered an error. Please try again." }]
            };
            setChatHistory(prev => [...prev, errorMessage]);
            handleError("Failed to get response", err);
        } finally {
            setIsQueryLoading(false);
        }
    };
    
    const renderContent = () => {
        switch(status) {
            case AppStatus.Initializing:
                return (
                    <div className="flex items-center justify-center h-screen">
                        <Spinner /> <span className="ml-4 text-xl">Initializing...</span>
                    </div>
                );
            case AppStatus.Welcome:
                 return <WelcomeScreen 
                    apiKeyError={apiKeyError} 
                    isApiKeySelected={isApiKeySelected} 
                    onSelectKey={handleSelectKey}
                    onManualApiKeySubmit={handleManualApiKeySubmit}
                    showManualInput={!isApiKeySelected && !(process.env.GEMINI_API_KEY || process.env.API_KEY)}
                    stores={stores}
                    onSelectStore={handleSelectStore}
                    onDeleteStore={handleDeleteStore}
                    onRefreshStores={refreshStores}
                    onCreateStore={handleCreateStore}
                 />;
            case AppStatus.Uploading:
                let icon = null;
                if (uploadProgress?.message === "Creating document index..." || uploadProgress?.message === "Loading knowledge base...") {
                    icon = <img src="https://services.google.com/fh/files/misc/applet-upload.png" alt="Uploading files icon" className="h-80 w-80 rounded-lg object-cover" />;
                } else if (uploadProgress?.message === "Generating embeddings...") {
                    icon = <img src="https://services.google.com/fh/files/misc/applet-creating-embeddings_2.png" alt="Creating embeddings icon" className="h-240 w-240 rounded-lg object-cover" />;
                } else if (uploadProgress?.message === "Generating suggestions..." || uploadProgress?.message === "Retrieving examples...") {
                    icon = <img src="https://services.google.com/fh/files/misc/applet-suggestions_2.png" alt="Generating suggestions icon" className="h-240 w-240 rounded-lg object-cover" />;
                } else if (uploadProgress?.message === "All set!" || uploadProgress?.message === "Ready!") {
                    icon = <img src="https://services.google.com/fh/files/misc/applet-completion_2.png" alt="Completion icon" className="h-240 w-240 rounded-lg object-cover" />;
                }

                return <ProgressBar 
                    progress={uploadProgress?.current || 0} 
                    total={uploadProgress?.total || 1} 
                    message={uploadProgress?.message || "Preparing your chat..."} 
                    fileName={uploadProgress?.fileName}
                    icon={icon}
                />;
            case AppStatus.Chatting:
                // Construct a partial store object for DocumentList to use display name
                const currentStore = { 
                    name: activeRagStoreName || '', 
                    displayName: documentName 
                };

                return <ChatInterface 
                    documentName={documentName}
                    history={chatHistory}
                    isQueryLoading={isQueryLoading}
                    onSendMessage={handleSendMessage}
                    onNewChat={handleEndChat}
                    exampleQuestions={exampleQuestions}
                    
                    // Document Management Props
                    documents={documents}
                    isDocumentsLoading={isDocumentsLoading}
                    onUploadFile={handleUploadDocument}
                    onDeleteFile={handleDeleteDocument}
                    processingFile={processingFile}
                    currentStore={currentStore}
                />;
            case AppStatus.Error:
                 return (
                    <div className="flex flex-col items-center justify-center h-screen bg-red-900/20 text-red-300">
                        <h1 className="text-3xl font-bold mb-4">Application Error</h1>
                        <p className="max-w-md text-center mb-4">{error}</p>
                        <button onClick={clearError} className="px-4 py-2 rounded-md bg-gem-mist hover:bg-gem-mist/70 transition-colors" title="Return to the welcome screen">
                           Try Again
                        </button>
                    </div>
                );
            default:
                 return <WelcomeScreen 
                    apiKeyError={apiKeyError} 
                    isApiKeySelected={isApiKeySelected} 
                    onSelectKey={handleSelectKey}
                    onManualApiKeySubmit={handleManualApiKeySubmit}
                    showManualInput={!isApiKeySelected && !(process.env.GEMINI_API_KEY || process.env.API_KEY)}
                    stores={stores}
                    onSelectStore={handleSelectStore}
                    onDeleteStore={handleDeleteStore}
                    onRefreshStores={refreshStores}
                    onCreateStore={handleCreateStore}
                />;
        }
    }

    return (
        <main className="h-screen bg-gem-onyx text-gem-offwhite relative">
            {renderContent()}
            
            <ConfirmDialog 
                isOpen={!!storeToDelete}
                title="Delete Knowledge Base"
                message="Are you sure you want to delete this knowledge base? This action cannot be undone."
                onConfirm={confirmDeleteStore}
                onCancel={() => setStoreToDelete(null)}
            />

            <ConfirmDialog 
                isOpen={!!docToDelete}
                title="Delete Document"
                message="Are you sure you want to delete this document from the knowledge base?"
                onConfirm={confirmDeleteDocument}
                onCancel={() => setDocToDelete(null)}
            />

            {notification && (
                <NotificationToast 
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}
        </main>
    );
};

export default App;
