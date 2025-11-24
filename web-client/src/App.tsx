import { useState, useEffect } from 'react';
import ProjectList from './components/ProjectList';
import ChatInterface from './components/ChatInterface';

function App() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white">
      {!selectedProject ? (
        <>
          {/* Simple Header for Project List */}
          <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">G</span>
              </div>
              <span className="font-semibold text-gray-900">Gemini Document Sync</span>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <ProjectList onSelectProject={setSelectedProject} />
          </main>
        </>
      ) : (
        <ChatInterface
          projectName={selectedProject}
          onBack={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}

export default App;
