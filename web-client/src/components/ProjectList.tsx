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

    if (loading) return <div className="text-gray-600">Loading projects...</div>;
    if (error) return <div className="text-red-500">Error: {error}</div>;

    return (
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Select a Project</h2>
                <button
                    onClick={fetchProjects}
                    disabled={loading}
                    className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh Projects"
                    aria-label="Refresh projects"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    </div>
                    <p className="text-gray-300 text-lg font-medium mb-2">No projects found</p>
                    <p className="text-gray-500 text-sm">Sync files using the VS Code extension first.</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {projects.map(project => (
                        <li key={project}>
                            <div className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-white/5 to-white/10 hover:from-white/10 hover:to-white/15 text-white transition-all duration-300 border border-white/10 hover:border-white/20 group flex items-center justify-between shadow-lg hover:shadow-xl hover:scale-[1.02]">
                                <button
                                    onClick={() => onSelectProject(project)}
                                    className="flex-1 text-left flex items-center gap-4"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                        {project.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-semibold text-lg">{project}</span>
                                </button>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => handleDelete(project, e)}
                                        disabled={deleting === project}
                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 group-hover:text-blue-400 transition-colors group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
