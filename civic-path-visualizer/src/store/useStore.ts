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

export type AppState = 'idle' | 'active' | 'loading' | 'success' | 'error';
export type NodeStatus = 'locked' | 'in-progress' | 'completed';

interface FlowState {
  nodes: Node[]; edges: Edge[]; selectedNodeId: string | null;
  graphDatabase: ApiPayload | null;
  chatHistory: ChatMessage[];
  isLoading: boolean;
  appState: AppState;
  nodeStatuses: Record<string, NodeStatus>;
  
  fetchGraphData: (userQuery: string, attachToNodeId?: string | null) => void;
  setSelectedNode: (id: string | null) => void;
  toggleNode: (parentId: string) => void; 
  setAppState: (state: AppState) => void;
  markAllPrerequisitesCompleted: () => void;
  completeNode: (nodeId: string) => void;
  completeProcess: (nodeId: string) => void;
}

const updateCascadeLogic = (get: any, set: any) => {
  const state = get() as FlowState;
  const db = state.graphDatabase;
  if (!db) return;
  
  const newStatuses = { ...state.nodeStatuses };
  
  const prereqParentId = 'node_prereqs_main';
  const prereqParent = db.nodes[prereqParentId];
  let prereqsDone = false;
  
  if (prereqParent && prereqParent.prerequisites && prereqParent.prerequisites.length > 0) {
    prereqsDone = prereqParent.prerequisites.every(reqId => newStatuses[reqId] === 'completed');
  } else {
    // If no prerequisites exist, treat them as done
    prereqsDone = true;
  }

  // Unlock step_1
  if (prereqsDone && newStatuses['step_1'] === 'locked') {
    newStatuses['step_1'] = 'in-progress';
  }

  // Cascade steps
  for (let i = 1; i <= 20; i++) {
    const currentStep = `step_${i}`;
    const nextStep = `step_${i+1}`;
    if (newStatuses[currentStep] === 'completed' && newStatuses[nextStep] === 'locked') {
      newStatuses[nextStep] = 'in-progress';
    }
  }
  
  set({ nodeStatuses: newStatuses });
};

export const useStore = create<FlowState>((set, get) => ({
  nodes: [], edges: [], selectedNodeId: null, graphDatabase: null, chatHistory: [], isLoading: false, appState: 'idle', nodeStatuses: {},

  fetchGraphData: (userQuery: string, attachToNodeId?: string | null) => {
    const newMsgId = Date.now().toString();
    
    set((state) => ({
      isLoading: true,
      appState: 'loading',
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
          console.log("[useStore] Received 'complete' payload:", response.payload);
          const liveData: ApiPayload = response.payload;
          const parentId = response.attachToNodeId; // Could be null for isolated islands
          const currentDb = get().graphDatabase;

          let mergedDb = liveData;
          let rawNodes: Node[] = [];
          let rawEdges: Edge[] = [];
          
          try {
            // Initialize new node statuses to locked
            const currentStatuses = { ...get().nodeStatuses };
            Object.keys(liveData.nodes || {}).forEach(id => {
              if (!currentStatuses[id]) currentStatuses[id] = 'locked';
            });
            set({ nodeStatuses: currentStatuses });

            if (parentId && currentDb) {
              console.log("[useStore] Merging with existing node", parentId);
              // Attach to existing node
              mergedDb = { ...currentDb, nodes: { ...currentDb.nodes, ...liveData.nodes } };
              mergedDb.nodes[parentId].prerequisites = [
                ...(mergedDb.nodes[parentId].prerequisites || []),
                ...(liveData.initialNodes || [])
              ];

              const newNodes: Node[] = (liveData.initialNodes || []).map(id => ({ 
                id, type: 'custom', position: { x: 0, y: 0 }, data: liveData.nodes[id] 
              } as Node));
              
              rawNodes = [...get().nodes, ...newNodes];
              
              const newExtensionEdges: Edge[] = (liveData.initialNodes || []).map(childId => ({
                id: `e-${parentId}-${childId}`, source: parentId, target: childId, animated: true, style: { stroke: '#10b981', strokeDasharray: '5 5', strokeWidth: 2 }
              } as Edge));
              
              rawEdges = [...get().edges, ...newExtensionEdges];
            } else if (parentId === null && currentDb) {
              console.log("[useStore] Generating isolated island");
              // Isolated subgraph (floating island)
              mergedDb = { ...currentDb, nodes: { ...currentDb.nodes, ...liveData.nodes } };
              
              const islandNodes: Node[] = (liveData.initialNodes || []).map((id, index) => ({ 
                id, type: 'custom', 
                position: { x: index * 350, y: -400 }, 
                data: liveData.nodes[id] 
              } as Node));
              
              const islandEdges: Edge[] = (liveData.initialEdges || []).map(e => ({ 
                id: `e-${e.source}-${e.target}`, source: e.source, target: e.target, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } 
              } as Edge));

              set((state) => ({
                nodes: [...state.nodes, ...islandNodes],
                edges: [...state.edges, ...islandEdges],
                graphDatabase: mergedDb
              }));
            } else {
              console.log("[useStore] Generating first time graph");
              // First time load
              rawNodes = (liveData.initialNodes || []).map(id => ({ 
                id, type: 'custom', position: { x: 0, y: 0 }, 
                data: liveData.nodes?.[id] || { id, type: 'process', title: id.replace(/_/g, ' '), chatText: '', prerequisites: [] }
              } as Node));
              rawEdges = (liveData.initialEdges || [])
                .filter(e => !(e.source === 'node_prereqs_main' && e.target === 'step_1'))
                .map(e => ({ 
                  id: `e-${e.source}-${e.target}`, source: e.source, target: e.target, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } 
                } as Edge));
            }

            const isIsolatedIsland = parentId === null && currentDb;

            if (!isIsolatedIsland) {
              console.log("[useStore] Running layout engine with rawNodes:", rawNodes.length);
              const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rawNodes, rawEdges, 'LR'); 
              console.log("[useStore] Layout Engine output nodes:", layoutedNodes.length);
              set({ nodes: layoutedNodes, edges: layoutedEdges, graphDatabase: mergedDb });
            }

            updateCascadeLogic(get, set);
            
            set((state) => ({ 
              isLoading: false,
              appState: 'success', 
              chatHistory: state.chatHistory
                .filter(msg => msg.id !== `status-${newMsgId}`)
                .concat({ id: `agent-${newMsgId}`, role: 'agent', text: liveData.narrative })
            }));
            
            ws.close();
            setTimeout(() => { set({ appState: 'active' }); }, 3000);
            
          } catch (parseError) {
            console.error("[useStore] Critical Parsing/Layout Error:", parseError);
            set({ isLoading: false, appState: 'error' });
            setTimeout(() => set({ appState: 'active' }), 3000);
          }
        }
      } catch (error) { 
        console.error("[useStore] WebSocket general error:", error); 
        set({ isLoading: false, appState: 'error' });
        setTimeout(() => set({ appState: 'active' }), 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket connection error:', error);
      set({ isLoading: false, appState: 'error' });
      setTimeout(() => set({ appState: 'active' }), 3000);
    };
  },

  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setAppState: (appState) => set({ appState }),
  
  markAllPrerequisitesCompleted: () => {
    const state = get();
    const prereqParent = state.graphDatabase?.nodes['node_prereqs_main'];
    if (!prereqParent) return;
    
    const newStatuses = { ...state.nodeStatuses };
    prereqParent.prerequisites.forEach(reqId => {
      newStatuses[reqId] = 'completed';
    });
    
    // Set step_1 as the selected node so the camera physically pans to it
    set({ nodeStatuses: newStatuses, selectedNodeId: 'step_1' });
    updateCascadeLogic(get, set);

    // If the radial flower is currently open, collapse it gracefully
    const isExpanded = state.edges.some(
      (edge) => edge.source === 'node_prereqs_main' && prereqParent.prerequisites.includes(edge.target)
    );
    
    if (isExpanded) {
      get().toggleNode('node_prereqs_main');
    }
  },
  
  completeNode: (nodeId: string) => {
    const newStatuses = { ...get().nodeStatuses };
    newStatuses[nodeId] = 'completed';
    set({ nodeStatuses: newStatuses });
    updateCascadeLogic(get, set);
  },

  completeProcess: (nodeId: string) => {
    const state = get();
    const newStatuses = { ...state.nodeStatuses };
    newStatuses[nodeId] = 'completed';
    
    // Automatically pan the camera to the next sequential step
    let nextStepId = null;
    if (nodeId.startsWith('step_')) {
      const currentNum = parseInt(nodeId.split('_')[1], 10);
      nextStepId = `step_${currentNum + 1}`;
      if (!state.graphDatabase?.nodes[nextStepId]) {
        nextStepId = null;
      }
    }

    set({ 
      nodeStatuses: newStatuses, 
      ...(nextStepId ? { selectedNodeId: nextStepId } : {}) 
    });
    
    updateCascadeLogic(get, set);
  },

  toggleNode: (parentId) => {
    const { nodes, edges, graphDatabase } = get();
    if (!graphDatabase) return;
    
    const parentData = graphDatabase.nodes[parentId];
    if (!parentData || !parentData.prerequisites.length) return;

    const isExpanded = edges.some(
      (edge) => edge.source === parentId && parentData.prerequisites.includes(edge.target)
    );

    if (isExpanded) {
      const nodesToRemove = new Set<string>();
      const queue = [parentId];

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = edges
          .filter(e => e.source === currentId && !graphDatabase.initialNodes.includes(e.target))
          .map(e => e.target);
        children.forEach(child => { nodesToRemove.add(child); queue.push(child); });
      }

      set({
        nodes: nodes.map(n => nodesToRemove.has(n.id) ? { ...n, className: 'exiting-node' } : n),
        edges: edges.filter(e => !nodesToRemove.has(e.source) && !nodesToRemove.has(e.target))
      });

      setTimeout(() => {
        const currentStore = get();
        const remainingNodes = currentStore.nodes.filter(n => !nodesToRemove.has(n.id));
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(remainingNodes, currentStore.edges, 'LR');
        set({ nodes: layoutedNodes, edges: layoutedEdges });
      }, 300);

    } else {
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
        'LR'
      );

      set({ nodes: layoutedNodes, edges: layoutedEdges });
    }
  }
}));