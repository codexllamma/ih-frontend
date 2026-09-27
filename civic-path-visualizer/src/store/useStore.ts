import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import { getLayoutedElements } from '../utils/layout';

export type NodeData = {
  id: string; type: string; title: string; chatText: string; actionLink?: string; prerequisites: string[];
};

export type ApiPayload = {
  task: string; narrative: string; initialNodes: string[]; initialEdges: { source: string; target: string }[]; nodes: Record<string, NodeData>;
};

type ChatMessage = { id: string; role: 'user' | 'agent' | 'status'; text: string; };

interface FlowState {
  nodes: Node[]; edges: Edge[]; selectedNodeId: string | null;
  graphDatabase: ApiPayload | null;
  chatHistory: ChatMessage[];
  isLoading: boolean;
  appState: 'idle' | 'active';
  
  fetchGraphData: (userQuery: string, attachToNodeId?: string) => void;
  setSelectedNode: (id: string | null) => void;
  toggleNode: (parentId: string) => void; 
  setAppState: (state: 'idle' | 'active') => void;
}

export const useStore = create<FlowState>((set, get) => ({
  nodes: [], edges: [], selectedNodeId: null, graphDatabase: null, chatHistory: [], isLoading: false, appState: 'idle',

  fetchGraphData: (userQuery: string, attachToNodeId?: string) => {
    const newMsgId = Date.now().toString();
    set((state) => ({
      isLoading: true,
      chatHistory: [
        ...state.chatHistory, 
        { id: `user-${newMsgId}`, role: 'user', text: userQuery },
        { id: `status-${newMsgId}`, role: 'status', text: "Connecting to server..." }
      ]
    }));
    
    const ws = new WebSocket('wss://factsheet-tradition-giblet.ngrok-free.dev/ws/generate-procedure');

    ws.onopen = () => ws.send(JSON.stringify({ query: userQuery, attachToNodeId }));

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        if (response.type === 'status') {
          set((state) => ({
            chatHistory: state.chatHistory.map(msg => msg.id === `status-${newMsgId}` ? { ...msg, text: response.message } : msg)
          }));
        } 
        else if (response.type === 'complete') {
          const liveData: ApiPayload = response.payload;
          const parentId = response.attachToNodeId;
          const currentDb = get().graphDatabase;

          let mergedDb = liveData;
          let rawNodes: Node[] = liveData.initialNodes.map(id => ({ 
            id, type: 'custom', position: { x: 0, y: 0 }, data: liveData.nodes[id] 
          } as Node));
          
          let rawEdges: Edge[] = liveData.initialEdges.map(e => ({ 
            id: `e-${e.source}-${e.target}`, source: e.source, target: e.target, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } 
          } as Edge));

          // THE MERGE LOGIC
          if (parentId && currentDb) {
            mergedDb = { ...currentDb, nodes: { ...currentDb.nodes, ...liveData.nodes } };
            
            mergedDb.nodes[parentId].prerequisites = [
              ...mergedDb.nodes[parentId].prerequisites,
              ...liveData.initialNodes
            ];

            const newNodes: Node[] = liveData.initialNodes.map(id => ({ 
              id, type: 'custom', position: { x: 0, y: 0 }, data: liveData.nodes[id] 
            } as Node));
            
            rawNodes = [...get().nodes, ...newNodes];
            
            const newExtensionEdges: Edge[] = liveData.initialNodes.map(childId => ({
              id: `e-${parentId}-${childId}`, source: parentId, target: childId, animated: true, style: { stroke: '#10b981', strokeDasharray: '5 5', strokeWidth: 2 }
            } as Edge));
            
            rawEdges = [...get().edges, ...newExtensionEdges, ...rawEdges];
          }

          const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges, 'TB'); // Note the 'TB' added here
          
          set((state) => ({ 
            nodes: layoutedNodes, 
            edges: layoutedEdges, 
            graphDatabase: mergedDb, 
            isLoading: false,
            chatHistory: state.chatHistory
              .filter(msg => msg.id !== `status-${newMsgId}`)
              .concat({ id: `agent-${newMsgId}`, role: 'agent', text: liveData.narrative })
          }));
          
          ws.close();
        }
      } catch (error) { console.error(error); }
    };
  },

  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setAppState: (appState) => set({ appState }),

  toggleNode: (parentId) => {
    const { nodes, edges, graphDatabase } = get();
    
    // Safety check: Don't run if data hasn't loaded yet
    if (!graphDatabase) return;
    
    const parentData = graphDatabase.nodes[parentId];
    if (!parentData || !parentData.prerequisites.length) return;

    // Check if prerequisite edges are visible
    const isExpanded = edges.some(
      (edge) => edge.source === parentId && parentData.prerequisites.includes(edge.target)
    );

    if (isExpanded) {
      // --- COLLAPSE LOGIC ---
      const nodesToRemove = new Set<string>();
      const queue = [parentId];

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        
        // Target children NOT part of the initial timeline
        const children = edges
          .filter(e => e.source === currentId && !graphDatabase.initialNodes.includes(e.target))
          .map(e => e.target);
          
        children.forEach(child => {
          nodesToRemove.add(child);
          queue.push(child);
        });
      }

      set({
        nodes: nodes.map(n => nodesToRemove.has(n.id) ? { ...n, className: 'exiting-node' } : n),
        edges: edges.filter(e => !nodesToRemove.has(e.source) && !nodesToRemove.has(e.target))
      });

      setTimeout(() => {
        const currentStore = get();
        const remainingNodes = currentStore.nodes.filter(n => !nodesToRemove.has(n.id));
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(remainingNodes, currentStore.edges, 'TB');
        set({ nodes: layoutedNodes, edges: layoutedEdges });
      }, 300);

    } else {
      // --- EXPAND LOGIC ---
      const existingNodeIds = new Set(nodes.map(n => n.id));
      const newPrereqs = parentData.prerequisites.filter(reqId => !existingNodeIds.has(reqId));
      if (newPrereqs.length === 0) return;

      const newNodes: Node[] = newPrereqs.map((reqId) => {
        const data = graphDatabase.nodes[reqId];
        return { id: reqId, type: 'custom', position: { x: 0, y: 0 }, data: { ...data } } as Node;
      });

      const newEdges: Edge[] = newPrereqs.map((reqId) => ({
        id: `e-${parentId}-${reqId}`,
        source: parentId,
        target: reqId,
        animated: true,
        style: { stroke: '#10b981', strokeDasharray: '5 5', strokeWidth: 2 },
      } as Edge));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        [...nodes, ...newNodes],
        [...edges, ...newEdges],
        'TB'
      );

      set({ nodes: layoutedNodes, edges: layoutedEdges });
    }
  }
}));