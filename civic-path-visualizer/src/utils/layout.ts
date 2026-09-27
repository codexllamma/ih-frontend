import dagre from '@dagrejs/dagre';
import { Position } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';

const nodeWidth = 280;
const nodeHeight = 100;

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  // 1. Identify prerequisite children to isolate them from Dagre
  const prereqParentId = 'node_prereqs_main';
  const prereqEdges = edges.filter(e => e.source === prereqParentId);
  const prereqChildIds = new Set(prereqEdges.map(e => e.target));
  
  // Completely isolate BOTH the parent and the children from Dagre
  const dagreNodes = nodes.filter(n => !prereqChildIds.has(n.id) && n.id !== prereqParentId);
  const dagreEdges = edges.filter(e => !prereqChildIds.has(e.target) && e.source !== prereqParentId && e.target !== prereqParentId);

  // 2. Run Dagre on the main timeline
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 150, 
    ranksep: 250, 
    align: 'UL',
  });

  dagreNodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  dagreEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes: Node[] = [];

  // 3. Map Dagre positions for the Timeline
  dagreNodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };

    layoutedNodes.push({
      ...node,
      targetPosition: direction === 'TB' ? Position.Top : Position.Left,
      sourcePosition: direction === 'TB' ? Position.Bottom : Position.Right,
      position,
    });
  });

  // 4. Calculate dynamic radius and parent position
  const prereqChildren = nodes.filter(n => prereqChildIds.has(n.id));
  const totalChildren = prereqChildren.length;
  // Increase base radius and scale up if there are many children (nodes are 300px wide)
  const radius = Math.max(450, totalChildren * 80); 
  
  // The parent must be pushed up enough so that its bottom-most child (radius distance away) still clears the timeline
  const parentPos = { x: 0, y: -(radius + 350) };
  
  const prereqParentNode = nodes.find(n => n.id === prereqParentId);
  if (prereqParentNode) {
    layoutedNodes.push({
      ...prereqParentNode,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      position: parentPos,
    });
  }

  // 5. Compute Radial "Flower" positions for prereq children
  prereqChildren.forEach((child, i) => {
    const angle = (i / totalChildren) * Math.PI * 2 - Math.PI / 2;
    layoutedNodes.push({
      ...child,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      zIndex: 10 + i, // Z-Index stacking to prevent clipping
      position: {
        x: parentPos.x + Math.cos(angle) * radius,
        y: parentPos.y + Math.sin(angle) * radius,
      },
    });
  });

  return { nodes: layoutedNodes, edges };
};