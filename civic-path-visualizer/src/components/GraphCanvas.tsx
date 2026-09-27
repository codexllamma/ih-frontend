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
    setSelectedNode(node.id);
    if (node.data.type === 'process') toggleNode(node.id);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (selectedNodeId) {
        fitView({ nodes: [{ id: selectedNodeId }], padding: 2, duration: 1000, maxZoom: 1.1 });
      } else {
        fitView({ padding: 0.3, duration: 800 });
      }
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [selectedNodeId, nodes.length, fitView]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3, duration: 800 }}
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