import { useState } from 'react';
import ProjectList from './components/ProjectList';
import ChatInterface from './components/ChatInterface';

function App() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-6xl flex flex-col items-center relative z-10">
        <header className="mb-8 md:mb-16 text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-1 shadow-2xl shadow-purple-500/50 mb-4">
            <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 md:h-12 md:w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-2 tracking-tight leading-tight">
            Gemini Document Sync
          </h1>
          <p className="text-gray-300 text-base md:text-xl max-w-2xl mx-auto text-balance">
            Chat with your project files instantly using AI-powered search
          </p>
        </header>

        <main className="w-full flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
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
