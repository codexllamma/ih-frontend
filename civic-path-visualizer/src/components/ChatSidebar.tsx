import { Info, Send, ArrowRight, ChevronRight, Mic, MicOff } from 'lucide-react';
import { useStore } from '../store/useStore';
import React, { useState, useRef, useEffect } from 'react';
import { useVoice } from '../hooks/useVoice';

const InteractiveNarrative = ({ text }: { text: string }) => {
  const { setSelectedNode, toggleNode } = useStore();
  const parts = text.split(/\[([^\]]+)\]\(node:([^\)]+)\)/g);
  return (
    <p className="text-slate-700 leading-relaxed text-[15px] font-medium">
      {parts.map((part, index) => {
        if (index % 3 === 0) return <span key={index}>{part}</span>;
        if (index % 3 === 1) {
          const nodeId = parts[index + 1];
          return (
            <button key={index} onClick={() => { setSelectedNode(nodeId); toggleNode(nodeId); }}
              className="group inline-flex items-center text-indigo-600 font-semibold hover:text-indigo-800 transition-colors mx-0.5 border-b border-indigo-200 hover:border-indigo-600 cursor-pointer">
              {part}
              <ChevronRight className="opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" size={14}/>
            </button>
          );
        }
        return null;
      })}
    </p>
  );
};

export const ChatSidebar = () => {
  const { selectedNodeId, graphDatabase, chatHistory, isLoading, fetchGraphData, appState, isListening } = useStore();
  const { startRecording, stopRecording, isRecording } = useVoice();
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const selectedNode = selectedNodeId && graphDatabase ? graphDatabase.nodes[selectedNodeId] : null;

  const handleMicToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    fetchGraphData(input);
    setInput('');
  };

  return (
    // 🔥 PREMIUM FIX: Matched the physics to duration-1000 and cubic-bezier(0.16,1,0.3,1), added deep shadow
    <div className={`absolute top-6 right-6 bottom-6 w-[400px] bg-white/70 backdrop-blur-2xl border-l border-white/60 shadow-[-20px_0_40px_rgba(0,0,0,0.05)] rounded-3xl flex flex-col z-30 transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
      appState !== 'idle' ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
    }`}>
      
      <div className="p-6 shrink-0 flex items-center gap-3 border-b border-white/40">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm">
          <div className="w-3 h-3 bg-white rounded-full"></div>
        </div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Civic Navigator</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-6 pt-6">
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
            <Info className="text-slate-400 mb-4" size={32}/>
            <p className="text-slate-500 font-medium">Type a civic process below to begin.</p>
          </div>
        )}

        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex w-full animate-in fade-in slide-in-from-bottom-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div className="max-w-[85%] px-4 py-2 rounded-xl border border-slate-400/40 bg-transparent text-slate-800">
                <p className="text-[14px] font-semibold">{msg.text}</p>
              </div>
            ) : msg.role === 'status' ? (
              <div className="flex items-center gap-3 text-indigo-500/80 font-mono text-xs font-semibold animate-pulse pl-4 border-l-2 border-indigo-200">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                {msg.text}
              </div>
            ) : (
              <div className="max-w-[95%] pl-4 py-1 border-l-2 border-indigo-300/80">
                <InteractiveNarrative text={msg.text}/>
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {selectedNode && (
        <div className="p-5 bg-white/50 backdrop-blur-xl border-t border-white/60 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] shrink-0 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-start mb-3">
            <div className="inline-block px-2.5 py-1 bg-white/80 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-md border border-white/60">
              {selectedNode.type}
            </div>
            <button onClick={() => useStore.getState().setSelectedNode(null)} className="text-slate-400 hover:text-slate-800 text-xs font-bold transition-colors">&times; CLOSE</button>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">{selectedNode.title}</h2>
          <p className="text-slate-600 leading-relaxed text-[13px] mb-5">{selectedNode.chatText}</p>
          {selectedNode.type === 'document' && (
            <button onClick={() => fetchGraphData(`How do I get a ${selectedNode.title}?`, selectedNode.id)} disabled={isLoading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              Don't have this? Ask AI <ArrowRight size={16}/>
            </button>
          )}
        </div>
      )}

      <div className="p-5 pt-2 shrink-0 bg-transparent">
        <form onSubmit={handleSend} className="relative group">
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            disabled={isLoading || isRecording || isListening} 
            placeholder={isRecording ? "Listening..." : "Ask the AI..."} 
            className="w-full bg-white/50 backdrop-blur-md text-slate-800 font-medium border border-slate-300/60 shadow-sm rounded-2xl py-3.5 pl-5 pr-24 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all disabled:opacity-50" 
          />
          
          <button 
            type="button" 
            onClick={handleMicToggle}
            className={`absolute right-12 top-2 bottom-2 aspect-square flex items-center justify-center rounded-xl transition-all shadow-sm ${
              isRecording 
                ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                : 'bg-white/80 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {isRecording ? <Mic size={16}/> : <MicOff size={16}/>}
          </button>

          <button 
            type="submit" 
            disabled={isLoading || !input.trim() || isRecording} 
            className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
          >
            <Send size={16}/>
          </button>
        </form>
      </div>
    </div>
  );
};