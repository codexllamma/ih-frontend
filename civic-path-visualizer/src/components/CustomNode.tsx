import { Handle, Position } from '@xyflow/react';
import { FileText, Globe, GitMerge, Lock, CheckCircle, BrainCircuit } from 'lucide-react';
import { useStore } from '../store/useStore';

export const CustomNode = ({ data, id }: any) => {
  const { selectedNodeId, nodeStatuses, markAllPrerequisitesCompleted, completeNode, fetchGraphData, completeProcess } = useStore();
  const isSelected = selectedNodeId === id;
  const status = nodeStatuses[id] || 'locked';

  if (!data) return null;

  const Icon = data.type === 'document' ? FileText : data.type === 'external_link' ? Globe : GitMerge;
  
  let styleClasses = '';
  let statusIcon = null;

  if (status === 'locked') {
    styleClasses = 'opacity-50 border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.3)] pointer-events-none grayscale';
    statusIcon = <Lock size={14} className="text-red-400 absolute top-3 right-3" />;
  } else if (status === 'in-progress') {
    styleClasses = 'border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse';
  } else if (status === 'completed') {
    styleClasses = 'border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]';
    statusIcon = <CheckCircle size={16} className="text-emerald-400 absolute top-3 right-3" />;
  }

  // Override glow if selected and not locked
  if (isSelected && status !== 'locked') {
    styleClasses += ' ring-4 ring-cyan-400';
  }

  const handleAskAI = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchGraphData(`How do I get a ${data.title}?`, null);
  };

  const handleMarkPresent = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllPrerequisitesCompleted();
  };

  return (
    <div className={`custom-node-wrapper relative w-[300px] bg-slate-900/80 backdrop-blur-md border ${styleClasses} text-white rounded-xl p-5 transition-all duration-300 cursor-pointer`}>
      {statusIcon}
      <Handle className={`w-3 h-3 ${status === 'completed' ? 'bg-emerald-400 border-emerald-200' : 'bg-slate-700 border-slate-500'} -ml-1.5`} position={Position.Left} type="target"/>
      
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${status === 'completed' ? 'from-emerald-500 to-teal-600' : 'from-slate-700 to-slate-800'} text-white shadow-md`}>
          <Icon size={24} strokeWidth={2.5}/>
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <p className="text-[10px] text-cyan-300 uppercase tracking-widest font-black">{data.type}</p>
          <p className={`text-sm font-bold truncate pr-2 ${status === 'locked' ? 'text-slate-400' : 'text-cyan-50'}`}>{data.title}</p>
        </div>
      </div>

      {/* Expanded Details Cloud */}
      <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isSelected && data.chatText ? 'max-h-[500px] mt-4 opacity-100' : 'max-h-0 mt-0 opacity-0 pointer-events-none'
      }`}>
        <div className="p-3 bg-cyan-950/30 rounded-lg border border-cyan-800/30 shadow-inner relative">
          {/* Small notch to look like a speech bubble/cloud pointing up */}
          <div className="absolute -top-2 left-8 w-4 h-4 bg-cyan-950/30 border-l border-t border-cyan-800/30 rotate-45 transform origin-center"></div>
          <p className="text-xs text-cyan-100/80 leading-relaxed font-medium relative z-10">
            {data.chatText}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={`flex flex-col gap-2 transition-all duration-300 ${isSelected && data.type === 'process' ? 'mt-4' : 'mt-4'}`}>
        {id === 'node_prereqs_main' && (
          <button 
            onClick={handleMarkPresent}
            className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/50 rounded-lg text-xs font-bold transition-colors pointer-events-auto"
          >
            Mark All Present
          </button>
        )}
        

        {data.type === 'document' && status !== 'completed' && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); completeNode(id); }}
              className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/50 rounded-lg text-xs font-bold transition-colors pointer-events-auto"
            >
              Mark as Present
            </button>
            <button 
              onClick={handleAskAI}
              className="w-full py-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-500/50 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors pointer-events-auto"
            >
              <BrainCircuit size={14} /> Ask AI How to Get This
            </button>
          </>
        )}

        {data.type === 'process' && id !== 'node_prereqs_main' && status === 'in-progress' && (
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              completeProcess(id); 
            }}
            className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/50 rounded-lg text-xs font-bold transition-colors pointer-events-auto"
          >
            Complete Step
          </button>
        )}
      </div>

      <Handle className={`w-3 h-3 ${status === 'completed' ? 'bg-emerald-400 border-emerald-200' : 'bg-slate-700 border-slate-500'} -mr-1.5`} position={Position.Right} type="source"/>
    </div>
  );
};