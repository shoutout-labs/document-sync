import { useEffect, useState } from 'react';
import { listProjects, deleteProject } from '../services/geminiService';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { RefreshCw, Trash2, Brain, FileText } from 'lucide-react';

interface ProjectListProps {
    onSelectProject: (projectName: string) => void;
}

export default function ProjectList({ onSelectProject }: ProjectListProps) {
    const [projects, setProjects] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchProjects = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await listProjects();
            setProjects(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (projectName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        
        const confirmed = window.confirm(
            `Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

        setDeleting(projectName);
        setError(null);
        try {
            await deleteProject(projectName);
            await fetchProjects();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setDeleting(null);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-500 text-sm">Loading projects...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <div className="text-center space-y-4 max-w-md">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                        <span className="text-red-500 text-xl">!</span>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900 mb-1">Error loading projects</p>
                        <p className="text-sm text-gray-500">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Welcome Section */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                <div className="text-center space-y-6 max-w-2xl">
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <Brain className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">
                            Hey, I'm Gemini Document Sync
                        </h1>
                        <p className="text-lg text-gray-600">
                            How can I help you today?
                        </p>
                    </div>
                </div>
            </div>

            {/* Projects Grid */}
            {projects.length > 0 && (
                <div className="px-6 pb-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-gray-900">Your Projects</h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={fetchProjects}
                                disabled={loading}
                                className="text-gray-600 hover:text-gray-900"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {projects.map((project) => (
                                <Card
                                    key={project}
                                    className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-gray-200 hover:border-blue-300"
                                    onClick={() => onSelectProject(project)}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-4 flex-1">
                                                <Avatar className="h-12 w-12 rounded-xl">
                                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg rounded-xl">
                                                        {project.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-gray-900 mb-1 truncate">
                                                        {project}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 line-clamp-2">
                                                        AI-powered search ready for your codebase
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => handleDelete(project, e)}
                                                disabled={deleting === project}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                                            >
                                                {deleting === project ? (
                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {projects.length === 0 && (
                <div className="px-6 pb-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center py-12">
                            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                <FileText className="h-10 w-10 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
                            <p className="text-sm text-gray-500 max-w-md mx-auto">
                                Sync your project files using the VS Code extension to get started.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
