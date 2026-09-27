import { useEffect, useMemo } from 'react';
import { ReactFlow, Background, Controls, useReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from '../store/useStore';
import { CustomNode } from './CustomNode';

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

export const GraphCanvas = () => {
  return (
    <div className="w-full h-full bg-transparent relative">
      <ReactFlowProvider>
        {/* Ensure the ReactFlow component has no solid background */}
        <FlowCanvasInner/>
      </ReactFlowProvider>
    </div>
  );
};