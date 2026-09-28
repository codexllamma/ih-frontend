import { useState } from 'react';
import { GraphCanvas } from './components/GraphCanvas';
import { ChatSidebar } from './components/ChatSidebar';
import { Agent3D } from './components/Agent3D';
import { useStore } from './store/useStore';
import { X, Shield, User } from 'lucide-react';
import GoogleTranslate from './components/GoogleTranslate';
import { AdminPanel } from './components/AdminPanel';
import './App.css'; 

function App() {
  const { nodes, appState, setAppState } = useStore();
  const [viewMode, setViewMode] = useState<'client' | 'admin'>('client');

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      
      {/* 🌐 Top Bar (Google Translate & View Switcher) */}
      <div className="absolute top-4 right-4 z-[60] flex items-center gap-4">
        <div className="flex bg-white/80 backdrop-blur-md p-1 rounded-lg border border-slate-200/50 shadow-sm pointer-events-auto">
          <button 
            onClick={() => setViewMode('client')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'client' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100/50'}`}
          >
            <User size={16} /> Client View
          </button>
          <button 
            onClick={() => setViewMode('admin')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${viewMode === 'admin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100/50'}`}
          >
            <Shield size={16} /> Admin Panel
          </button>
        </div>
        <GoogleTranslate />
      </div>

      {/* Admin Panel Overlay */}
      <div className={`absolute inset-0 z-50 transition-all duration-500 bg-white ${
        viewMode === 'admin' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="w-full h-full pt-16">
          {viewMode === 'admin' && <AdminPanel />}
        </div>
      </div>

      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[120px]"></div>
        <div className="absolute top-[40%] right-[20%] w-[40%] h-[60%] rounded-full bg-indigo-400/20 blur-[120px]"></div>
      </div>
      
      {appState === 'error' && (
        <div className="absolute top-0 left-0 w-full z-[100] bg-red-600/90 text-white p-4 text-center font-mono font-bold shadow-2xl backdrop-blur-sm animate-pulse">
           CRITICAL ERROR: Check browser console or Network logs. Graph Payload crashed the state machine.
        </div>
      )}

      {/* 🔥 THE MASTER CONTAINER: Uses your exact Tailwind classes to slide everything together */}
      <div className={`absolute inset-0 z-10 transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        appState === 'idle' ? 'translate-x-105' : 'translate-x-[-225px]'
      }`}>
        
        <div 
          className={`w-full h-full flex flex-col items-center justify-center ${appState === 'idle' ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}
          onClick={() => appState === 'idle' && setAppState('active')}
        >
          
          {/* THE ROBOT CANVAS */}
          <div className="relative w-full h-[60vh] flex items-center justify-center pointer-events-auto">
             <Agent3D/>
          </div>
          
          {/* THE TEXT */}
          <div className={`text-center text-slate-700 font-bold text-2xl tracking-wide transition-all duration-500 mt-2 px-4 max-w-2xl mx-auto flex justify-center ${
            appState === 'idle' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}>
            How may I help you navigate the system today?
          </div>

        </div>
      </div>

      {/* GRAPH CANVAS FULL SCREEN */}
      <div className={`absolute inset-0 w-screen h-screen z-20 transition-all duration-1000 ${
        nodes.length > 0 ? 'opacity-100 translate-x-0 scale-100 pointer-events-auto' : 'opacity-0 -translate-x-12 scale-95 pointer-events-none'
      }`}>
        {/* We use pointer-events-auto inside so the graph is clickable, but empty space is click-through */}
        <div className="w-full h-full relative">
          <div className="absolute top-6 left-6 z-50 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
             <span className="text-xs font-bold text-slate-600 uppercase tracking-widest bg-white/50 px-2 py-1 rounded-md backdrop-blur-md shadow-sm">Active Civic Matrix</span>
          </div>
          <button 
            onClick={() => useStore.setState({ nodes: [], edges: [], graphDatabase: null, appState: 'idle', chatHistory: [] })} 
            className="absolute top-6 right-[420px] z-50 p-2 bg-white/50 hover:bg-white/80 rounded-full backdrop-blur-md text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
          >
            <X size={18} strokeWidth={2.5}/>
          </button>
          
          <GraphCanvas/>
        </div>
      </div>

      {/* CHAT SIDEBAR */}
      <ChatSidebar/>

    </div>
  );
}

export default App;