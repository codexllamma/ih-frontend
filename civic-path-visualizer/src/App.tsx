import { GraphCanvas } from './components/GraphCanvas';
import { ChatSidebar } from './components/ChatSidebar';
import { Agent3D } from './components/Agent3D';
import { useStore } from './store/useStore';
import { X } from 'lucide-react';

function App() {
  const { nodes, appState, setAppState } = useStore();

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[120px]"></div>
        <div className="absolute top-[40%] right-[20%] w-[40%] h-[60%] rounded-full bg-indigo-400/20 blur-[120px]"></div>
      </div>

      {/* THE ROBOT CONTAINER: Slides left when active */}
      {/* 1. THE SLIDE TRACK (Moves the whole container left) */}
<div className={`absolute inset-0 z-10 transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
  appState === 'idle' ? 'translate-x-105' : '-translate-x-50'
}`}>
  
  {/* 2. THE CENTERING BOX (Stacks robot and text in the dead middle) */}
  <div 
    className="w-full h-full flex flex-col items-center justify-center pointer-events-auto cursor-pointer"
    onClick={() => appState === 'idle' && setAppState('active')}
  >
    
    {/* 3. THE ROBOT CANVAS */}
    <div className="relative w-full h-[60vh] flex items-center justify-center">
       <Agent3D/>
    </div>
    
    {/* 4. THE TEXT (Fades away when clicked) */}
    <div className={`text-center text-slate-700 font-bold text-2xl tracking-wide transition-all duration-700 mt-2 ${
      appState === 'idle' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
    }`}>
      How may I help you navigate the system today?
    </div>

  </div>
</div>

      {/* GRAPH CANVAS MODAL */}
      <div className={`absolute top-6 left-6 bottom-6 right-[450px] z-20 transition-all duration-1000 ${
        nodes.length > 0 ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-12 scale-95 pointer-events-none'
      }`}>
        <div className="w-full h-full bg-white/5 backdrop-blur-lg border border-white/50 rounded-3xl shadow-2xl overflow-hidden p-2 flex flex-col relative">
          
          <div className="absolute top-4 left-6 z-20 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
             <span className="text-xs font-bold text-slate-600 uppercase tracking-widest bg-white/50 px-2 py-1 rounded-md backdrop-blur-md">Active Civic Matrix</span>
          </div>

          <button 
            onClick={() => useStore.setState({ nodes: [], edges: [], graphDatabase: null, appState: 'idle', chatHistory: [] })} 
            className="absolute top-4 right-6 z-20 p-2 bg-white/50 hover:bg-white/80 rounded-full backdrop-blur-md text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
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