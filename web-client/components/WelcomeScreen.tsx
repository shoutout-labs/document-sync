
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { RagStore } from '../types';
import TrashIcon from './icons/TrashIcon';
import PlusIcon from './icons/PlusIcon';

interface WelcomeScreenProps {
    apiKeyError: string | null;
    isApiKeySelected: boolean;
    onSelectKey: () => Promise<void>;
    onManualApiKeySubmit: (apiKey: string) => void;
    showManualInput: boolean;
    stores: RagStore[];
    onSelectStore: (store: RagStore) => void;
    onDeleteStore: (storeName: string) => void;
    onRefreshStores: () => void;
    onCreateStore: (displayName: string) => Promise<void>;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
    apiKeyError, 
    isApiKeySelected, 
    onSelectKey, 
    onManualApiKeySubmit,
    showManualInput,
    stores, 
    onSelectStore, 
    onDeleteStore, 
    onRefreshStores,
    onCreateStore
}) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newStoreName, setNewStoreName] = useState('');
    const [manualApiKey, setManualApiKey] = useState('');
    const [showManualInputField, setShowManualInputField] = useState(showManualInput);

    useEffect(() => {
        setShowManualInputField(showManualInput);
    }, [showManualInput]);

    const handleSelectKeyClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        await onSelectKey();
    };

    const handleCreateClick = () => {
        setIsCreateModalOpen(true);
    };

    const handleCloseCreateModal = () => {
        setIsCreateModalOpen(false);
        setNewStoreName('');
    };

    const handleConfirmCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newStoreName.trim()) {
            await onCreateStore(newStoreName.trim());
            handleCloseCreateModal();
        }
    };

    const handleManualApiKeySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualApiKey.trim()) {
            onManualApiKeySubmit(manualApiKey.trim());
            setManualApiKey('');
            setShowManualInputField(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-3xl text-center">
                <h1 className="text-4xl sm:text-5xl font-bold mb-2">Chat With Your Document</h1>
                <p className="text-gem-offwhite/70 mb-8">
                    Powered by <strong className="font-semibold text-gem-offwhite">FileSearch</strong>. Select or create a Knowledge Base to start.
                </p>

                <div className="w-full max-w-xl mx-auto mb-8">
                     {!isApiKeySelected ? (
                        <div className="space-y-4">
                            {window.aistudio?.openSelectKey ? (
                                <button
                                    onClick={handleSelectKeyClick}
                                    className="w-full bg-gem-blue hover:bg-blue-500 text-white font-semibold rounded-lg py-3 px-5 text-center focus:outline-none focus:ring-2 focus:ring-gem-blue"
                                >
                                    Select Gemini API Key to Begin
                                </button>
                            ) : null}
                            
                            {showManualInputField || !window.aistudio?.openSelectKey ? (
                                <div className="bg-gem-slate border border-gem-mist/50 rounded-lg p-4">
                                    <form onSubmit={handleManualApiKeySubmit} className="space-y-3">
                                        <label htmlFor="manual-api-key" className="block text-sm font-medium text-gem-offwhite mb-2">
                                            Enter Gemini API Key
                                        </label>
                                        <input
                                            id="manual-api-key"
                                            type="password"
                                            value={manualApiKey}
                                            onChange={(e) => setManualApiKey(e.target.value)}
                                            placeholder="Enter your Gemini API key"
                                            className="w-full bg-gem-mist border border-gem-mist/50 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-gem-blue text-gem-offwhite placeholder:text-gem-offwhite/50"
                                            autoFocus={showManualInputField}
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                disabled={!manualApiKey.trim()}
                                                className="flex-1 bg-gem-blue hover:bg-blue-500 text-white font-semibold rounded-md py-2 px-4 disabled:bg-gem-mist/50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Use API Key
                                            </button>
                                            {window.aistudio?.openSelectKey && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowManualInputField(false)}
                                                    className="px-4 py-2 text-sm text-gem-offwhite/70 hover:text-gem-offwhite transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowManualInputField(true)}
                                    className="w-full text-sm text-gem-offwhite/70 hover:text-gem-offwhite underline"
                                >
                                    Or enter API key manually
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="w-full bg-gem-slate border border-gem-mist/50 rounded-lg py-3 px-5 flex items-center justify-between shadow-sm">
                            <span className="text-gem-teal font-semibold flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                API Key Selected
                            </span>
                            <button
                                onClick={handleSelectKeyClick}
                                className="text-sm text-gem-blue hover:text-blue-600 font-medium hover:underline focus:outline-none"
                                title="Change Gemini API Key"
                            >
                                Change Key
                            </button>
                        </div>
                    )}
                     {apiKeyError && <p className="text-red-500 text-sm mt-2">{apiKeyError}</p>}
                </div>

                {isApiKeySelected && (
                    <>
                        <div className="flex items-center justify-between my-8">
                            <div className="flex-grow border-t border-gem-mist"></div>
                            <div className="flex items-center mx-4">
                                <span className="text-gem-offwhite/60">Existing Knowledge Bases</span>
                                <button 
                                    onClick={onRefreshStores}
                                    className="ml-2 p-1.5 bg-gem-mist hover:bg-gem-mist/70 rounded-full text-gem-offwhite transition-colors"
                                    title="Refresh List"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleCreateClick}
                                    className="ml-2 p-1.5 bg-gem-blue hover:bg-blue-500 rounded-full text-white transition-colors"
                                    title="Create New Knowledge Base"
                                >
                                    <PlusIcon />
                                </button>
                            </div>
                            <div className="flex-grow border-t border-gem-mist"></div>
                        </div>

                        {stores.length === 0 ? (
                            <div className="text-center py-8 bg-gem-mist/10 rounded-lg border border-dashed border-gem-mist mb-12">
                                <p className="text-gem-offwhite/60 italic">No existing knowledge bases found. <br/> Create one to get started.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                                {stores.map(store => (
                                    <button
                                        key={store.name}
                                        onClick={() => onSelectStore(store)}
                                        className="relative group bg-gem-slate p-4 rounded-lg border border-gem-mist/30 hover:border-gem-blue/50 hover:bg-gem-mist/10 transition-all text-left truncate shadow-sm h-auto min-h-[6rem] flex flex-col justify-center"
                                        title={store.displayName}
                                    >
                                        <div className="w-full mb-2">
                                            <span className="font-semibold text-gem-offwhite block truncate group-hover:text-gem-blue transition-colors">{store.displayName}</span>
                                            {store.activeDocumentsCount !== undefined && (
                                                <p className="text-xs text-gem-offwhite/60 mt-0.5">{store.activeDocumentsCount} documents</p>
                                            )}
                                        </div>
                                        <div className="text-xs text-gem-offwhite/50 font-mono bg-gem-mist/30 p-1.5 rounded truncate w-full pr-8">
                                            <span className="select-all">{store.name}</span>
                                        </div>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div
                                                onClick={(e) => { e.stopPropagation(); onDeleteStore(store.name); }}
                                                className="p-1.5 text-red-400 hover:text-red-300 bg-gem-onyx/50 hover:bg-gem-onyx rounded-full cursor-pointer"
                                                title="Delete Knowledge Base"
                                                role="button"
                                            >
                                                <TrashIcon />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

             {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
                    <div className="bg-gem-slate p-6 rounded-lg shadow-xl w-full max-w-md border border-gem-mist">
                        <h3 className="text-xl font-bold mb-4 text-gem-offwhite">Create New Knowledge Base</h3>
                        <form onSubmit={handleConfirmCreate}>
                            <input
                                type="text"
                                value={newStoreName}
                                onChange={(e) => setNewStoreName(e.target.value)}
                                placeholder="Enter name (e.g., Project X Manuals)"
                                className="w-full bg-gem-mist border border-gem-mist/50 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-gem-blue mb-6 text-gem-offwhite"
                                autoFocus
                            />
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={handleCloseCreateModal}
                                    className="px-4 py-2 rounded-md bg-gem-mist hover:bg-gem-mist/70 transition-colors text-gem-offwhite"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newStoreName.trim()}
                                    className="px-4 py-2 rounded-md bg-gem-blue hover:bg-blue-500 text-white transition-colors disabled:bg-gem-mist/50 disabled:cursor-not-allowed"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WelcomeScreen;
