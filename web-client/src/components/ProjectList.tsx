import { useEffect, useState } from 'react';
import { listProjects, deleteProject } from '../services/geminiService';

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
            <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-gray-400 text-sm">Loading projects...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full max-w-md bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-3xl shadow-2xl p-8">
                <div className="flex items-center gap-3 text-red-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p className="font-semibold">Error loading projects</p>
                        <p className="text-sm text-red-300 mt-1">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 transition-all duration-300 hover:shadow-purple-500/20">
            <div className="flex items-center justify-between mb-6 md:mb-8">
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Select a Project
                </h2>
                <button
                    onClick={fetchProjects}
                    disabled={loading}
                    className="text-gray-400 hover:text-white transition-all duration-200 p-2.5 hover:bg-white/10 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 active:scale-95"
                    title="Refresh Projects"
                    aria-label="Refresh projects"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-12 md:py-16">
                    <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-12 md:w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    </div>
                    <p className="text-gray-200 text-lg md:text-xl font-semibold mb-2">No projects found</p>
                    <p className="text-gray-400 text-sm md:text-base">Sync files using the VS Code extension first.</p>
                </div>
            ) : (
                <ul className="space-y-3 md:space-y-4">
                    {projects.map((project, index) => (
                        <li 
                            key={project}
                            className="animate-in fade-in slide-in-from-left-4"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="w-full px-5 md:px-6 py-4 md:py-5 rounded-2xl bg-gradient-to-r from-white/5 via-white/7 to-white/5 hover:from-white/10 hover:via-white/12 hover:to-white/10 text-white transition-all duration-300 border border-white/10 hover:border-white/20 group flex items-center justify-between shadow-lg hover:shadow-xl hover:shadow-purple-500/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer backdrop-blur-sm">
                                <button
                                    onClick={() => onSelectProject(project)}
                                    className="flex-1 text-left flex items-center gap-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded-xl p-1"
                                >
                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-shadow duration-300">
                                        {project.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-semibold text-base md:text-lg block truncate">{project}</span>
                                        <span className="text-xs md:text-sm text-gray-400 mt-0.5">Click to open</span>
                                    </div>
                                </button>
                                <div className="flex items-center gap-2 ml-4">
                                    <button
                                        onClick={(e) => handleDelete(project, e)}
                                        disabled={deleting === project}
                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                                        title="Delete project"
                                        aria-label={`Delete ${project}`}
                                    >
                                        {deleting === project ? (
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        )}
                                    </button>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6 text-gray-400 group-hover:text-blue-400 transition-all duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
