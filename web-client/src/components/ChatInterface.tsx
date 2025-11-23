import { useState, useRef, useEffect } from 'react';
import { askProject } from '../services/geminiService';

interface ChatInterfaceProps {
    projectName: string;
    onBack: () => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export default function ChatInterface({ projectName, onBack }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            const response = await askProject(userMessage, projectName);
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-5xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl flex flex-col h-[85vh] max-h-[800px] overflow-hidden transition-all duration-300 hover:shadow-purple-500/20">
            {/* Header */}
            <div className="p-5 md:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-lg shadow-purple-500/30">
                        {projectName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-base md:text-lg font-bold text-white">{projectName}</h2>
                        <p className="text-xs text-gray-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                            Gemini File Search
                        </p>
                    </div>
                </div>
                <button
                    onClick={onBack}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all duration-200 text-sm font-medium border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                    <span className="hidden md:inline">Change Project</span>
                    <span className="md:hidden">Back</span>
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-6 animate-in fade-in duration-500">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-white/10 flex items-center justify-center backdrop-blur-sm shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-12 md:w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-gray-300 text-base md:text-lg font-medium">Start a conversation</p>
                            <p className="text-gray-500 text-sm">Ask questions about your project files</p>
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div 
                        key={idx} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        style={{ animationDelay: `${idx * 50}ms` }}
                    >
                        <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 md:px-6 py-3 md:py-4 shadow-lg ${
                            msg.role === 'user'
                                ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-br-none'
                                : 'bg-white/10 text-gray-100 rounded-bl-none border border-white/10 backdrop-blur-sm'
                        }`}>
                            <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{msg.content}</div>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start animate-in fade-in duration-300">
                        <div className="bg-white/10 text-gray-300 rounded-2xl rounded-bl-none px-5 md:px-6 py-4 border border-white/10 flex items-center gap-2 backdrop-blur-sm shadow-lg">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 md:p-6 border-t border-white/10 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm">
                <div className="flex gap-3 md:gap-4">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about your codebase..."
                        className="flex-1 px-5 md:px-6 py-3 md:py-4 bg-black/20 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-sm md:text-base backdrop-blur-sm"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm md:text-base"
                    >
                        <span className="hidden md:inline">Send</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
}
