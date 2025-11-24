import { useState, useRef, useEffect } from 'react';
import { askProject } from '../services/geminiService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ArrowLeft, Send } from 'lucide-react';

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
        <div className="h-full flex flex-col bg-white">
            {/* Minimal Header */}
            <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBack}
                    className="text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Projects
                </Button>
                <div className="ml-4 text-sm text-gray-500">
                    {projectName}
                </div>
            </div>

            {/* Messages Area - ChatGPT Style */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-8">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white text-xl font-bold">G</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                                    How can I help you today?
                                </h2>
                            </div>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div 
                            key={idx} 
                            className="group mb-6"
                        >
                            <div className="flex gap-4">
                                {/* Avatar */}
                                <div className="flex-shrink-0">
                                    {msg.role === 'assistant' ? (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                            <span className="text-white text-sm font-bold">G</span>
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                                            <span className="text-gray-600 text-sm font-semibold">U</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Message Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="prose prose-sm max-w-none">
                                        <div className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="group mb-6">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                        <span className="text-white text-sm font-bold">G</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex gap-1.5 items-center">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area - ChatGPT Style */}
            <div className="border-t border-gray-200 bg-white">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <form onSubmit={handleSubmit} className="relative">
                        <div className="relative">
                            <Input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Message Gemini Document Sync..."
                                disabled={loading}
                                className="w-full h-12 pr-12 pl-4 bg-white border-gray-300 rounded-2xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                            <Button
                                type="submit"
                                disabled={loading || !input.trim()}
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-2">
                            Gemini Document Sync can make mistakes. Check important info.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
