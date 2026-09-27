import { Handle, Position } from '@xyflow/react';
import { FileText, Globe, GitMerge } from 'lucide-react';
import { useStore } from '../store/useStore';

export const CustomNode = ({ data, id }: any) => {
  const selectedNodeId = useStore((state) => state.selectedNodeId);
  const isSelected = selectedNodeId === id;
  const Icon = data.type === 'document' ? FileText : data.type === 'external_link' ? Globe : GitMerge;
  
  const glow = isSelected 
    ? 'border-indigo-400 ring-4 ring-indigo-500/20 shadow-2xl shadow-indigo-500/20 bg-white' 
    : 'border-white/60 shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-xl hover:shadow-2xl hover:border-indigo-200';

  return (
    <div className={`custom-node-wrapper relative w-[280px] border-2 ${glow} rounded-2xl p-4 text-slate-800 transition-all duration-300 cursor-pointer`}>
      {/* Target Handle at the TOP */}
      <Handle className="w-3 h-3 bg-white border-2 border-indigo-300 -mt-1" position={Position.Top} type="target"/>
      
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-xl bg-gradient-to-br ${data.type === 'document' ? 'from-teal-400 to-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'from-indigo-500 to-blue-600 text-white shadow-md shadow-blue-500/30'}`}>
          <Icon size={24} strokeWidth={2.5}/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-indigo-500/80 uppercase tracking-widest font-black">{data.type}</p>
          <p className="text-sm font-bold text-slate-800 truncate pr-2">{data.title}</p>
        </div>
      </div>

      {/* Source Handle at the BOTTOM */}
      <Handle className="w-3 h-3 bg-white border-2 border-indigo-300 -mb-1" position={Position.Bottom} type="source"/>
    </div>
  );
};