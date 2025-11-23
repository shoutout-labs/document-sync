import { useState } from 'react';
import ProjectList from './components/ProjectList';
import ChatInterface from './components/ChatInterface';

function App() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center p-4 font-sans text-white">
      <div className="w-full max-w-4xl flex flex-col items-center">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-4 tracking-tight">
            Gemini Document Sync
          </h1>
          <p className="text-gray-400 text-lg">
            Chat with your project files instantly.
          </p>
        </header>

        <main className="w-full flex justify-center">
          {!selectedProject ? (
            <ProjectList onSelectProject={setSelectedProject} />
          ) : (
            <ChatInterface
              projectName={selectedProject}
              onBack={() => setSelectedProject(null)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
