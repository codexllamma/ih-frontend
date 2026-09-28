import { useEffect, useMemo } from 'react';
import { ReactFlow, Background, Controls, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from '../store/useStore';
import { CustomNode } from './CustomNode';
import { X } from 'lucide-react';

const FlowCanvasInner = () => {
  const { nodes, edges, setSelectedNode, toggleNode, selectedNodeId } = useStore();
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
  const { fitView } = useReactFlow();

  const onNodeClick = (_: any, node: any) => {
    if (selectedNodeId === node.id) {
      // If already selected, collapse it
      setSelectedNode(null);
    } else {
      // Otherwise select it
      setSelectedNode(node.id);
      // Auto-expand its prerequisites in the graph if it has any
      if (node.data?.type === 'process') toggleNode(node.id);
    }
  };

  const onPaneClick = () => {
    setSelectedNode(null);
  };

  useEffect(() => {
    if (nodes.length === 0) return;

    // A. If a specific node is selected, zoom directly to it
    if (selectedNodeId) {
      if (selectedNodeId === 'node_prereqs_main') {
        // Zoom OUT to reveal the entire radial flower
        fitView({ 
          nodes: [{ id: selectedNodeId }], 
          duration: 1000, 
          padding: 3.5,  // Huge padding to frame the children
          maxZoom: 0.6   // Keep it zoomed out
        });
      } else {
        fitView({ 
          nodes: [{ id: selectedNodeId }], 
          duration: 800, 
          padding: 0.5,  
          maxZoom: 1.2   
        });
      }
    } 
    // B. If nothing is selected, focus on the "Prerequisites" root node
    else {
      const rootNode = nodes.find(n => n.id === 'node_prereqs_main');
      if (rootNode) {
        fitView({ 
          nodes: [{ id: rootNode.id }], 
          duration: 1000, 
          padding: 0.3,
          maxZoom: 1 
        });
      } else {
        // Fallback: Just fit the first node in the array
        fitView({ nodes: [nodes[0]], duration: 800, padding: 0.5, maxZoom: 1 });
      }
    }
  }, [nodes, selectedNodeId, fitView]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        minZoom={0.1}
        maxZoom={1.5}
        className="touch-none"
        style={{ width: '100%', height: '100%' }}
      >
        <Background className="opacity-40" color="#94a3b8" gap={24} size={2} />
        <Controls className="fill-indigo-600 text-indigo-900 bg-white/80 backdrop-blur-md border border-white/40 shadow-lg rounded-lg overflow-hidden" />
      </ReactFlow>
    </div>
  );
};

const OverlayGraphInner = () => {
  const { overlayNodes, overlayEdges } = useStore();
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (overlayNodes.length > 0) {
      // Small timeout to ensure nodes are mounted before fitting
      setTimeout(() => {
        fitView({ duration: 800, padding: 0.5, maxZoom: 1 });
      }, 50);
    }
  }, [overlayNodes, fitView]);

  return (
    <ReactFlow
      nodes={overlayNodes}
      edges={overlayEdges}
      nodeTypes={nodeTypes}
      minZoom={0.1}
      maxZoom={1.5}
      className="touch-none bg-slate-50/50"
      style={{ width: '100%', height: '100%' }}
    >
      <Background className="opacity-40" color="#3b82f6" gap={24} size={2} />
    </ReactFlow>
  );
};

export const GraphCanvas = () => {
  const { isOverlayOpen, setOverlayOpen } = useStore();
  return (
    <div className="w-full h-full bg-transparent relative">
      <ReactFlowProvider>
        <FlowCanvasInner/>
      </ReactFlowProvider>

      {/* OVERLAY GRAPH MODAL */}
      {isOverlayOpen && (
        <div className="absolute inset-8 z-[100] bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/50 overflow-hidden animate-in zoom-in-95 duration-300">
          <button 
            onClick={() => setOverlayOpen(false)}
            className="absolute top-6 right-6 z-[110] p-3 bg-white hover:bg-slate-100 rounded-full text-slate-500 shadow-md transition-all hover:scale-110"
          >
            <X size={20} strokeWidth={2.5}/>
          </button>
          
          <div className="absolute top-6 left-6 z-[110] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-widest bg-white/80 px-3 py-1.5 rounded-lg shadow-sm">AI Sub-Process Explorer</span>
          </div>

          <ReactFlowProvider>
            <OverlayGraphInner />
          </ReactFlowProvider>
        </div>
      )}
    </div>
  );
};