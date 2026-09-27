import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
console.log('🚀 Local Staging WebSocket Server running on ws://localhost:8080');

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const { query, attachToNodeId } = JSON.parse(data);
    
    ws.send(JSON.stringify({ type: 'status', message: 'Analyzing request...' }));
    setTimeout(() => ws.send(JSON.stringify({ type: 'status', message: 'Structuring dependency graph...' })), 1500);

    setTimeout(() => {
      // 1. EXTENSION GRAPH: If attachToNodeId exists, it's a subgraph request!
      if (attachToNodeId === "rent_agreement") {
        ws.send(JSON.stringify({
          type: 'complete',
          attachToNodeId,
          payload: {
            task: "Obtain Rent Agreement",
            narrative: "To get a Rent Agreement, you need a [Drafted Lease](node:draft_lease) and [Stamp Paper](node:stamp_paper) from a local vendor.",
            initialNodes: ["draft_lease", "stamp_paper"],
            initialEdges: [],
            nodes: {
              "draft_lease": { id: "draft_lease", type: "process", title: "Draft Lease", chatText: "Create a lease document with terms.", actionLink: null, prerequisites: [] },
              "stamp_paper": { id: "stamp_paper", type: "document", title: "Stamp Paper", chatText: "Purchase from court or vendor.", actionLink: null, prerequisites: [] }
            }
          }
        }));
      } 
      else if (attachToNodeId) {
         // Generic fallback so you can endlessly click "Ask AI" on any new document
         ws.send(JSON.stringify({
          type: 'complete',
          attachToNodeId,
          payload: {
            task: "Get Document",
            narrative: `To obtain this document, you need to submit [Form A](node:form_${attachToNodeId}) and pay the [Fee](node:fee_${attachToNodeId}).`,
            initialNodes: [`form_${attachToNodeId}`],
            initialEdges: [],
            nodes: {
              [`form_${attachToNodeId}`]: { id: `form_${attachToNodeId}`, type: "process", title: "Submit Application", chatText: "Fill out the required application.", actionLink: null, prerequisites: [`fee_${attachToNodeId}`] },
              [`fee_${attachToNodeId}`]: { id: `fee_${attachToNodeId}`, type: "document", title: "Payment Receipt", chatText: "Pay the required processing fee.", actionLink: null, prerequisites: [] }
            }
          }
        }));
      }
      // 2. MAIN GRAPH (Initial Query)
      else {
        ws.send(JSON.stringify({
          type: 'complete',
          payload: {
            task: "Business Registration",
            narrative: "To open a business, you must first clear the [Initial Setup](node:start_node). From there, you need a [Trade License](node:trade_license) and must register for [GST](node:gst_reg).",
            initialNodes: ["start_node"],
            initialEdges: [], 
            nodes: {
              "start_node": { id: "start_node", type: "process", title: "Business Setup", chatText: "The core requirements for starting.", actionLink: null, prerequisites: ["trade_license", "gst_reg"] },
              "trade_license": { id: "trade_license", type: "process", title: "Trade License", chatText: "Municipal clearance.", actionLink: null, prerequisites: ["rent_agreement"] },
              "rent_agreement": { id: "rent_agreement", type: "document", title: "Rent Agreement", chatText: "Notarized lease.", actionLink: null, prerequisites: [] },
              "gst_reg": { id: "gst_reg", type: "process", title: "GST Registration", chatText: "Tax registration.", actionLink: null, prerequisites: ["pan_card"] },
              "pan_card": { id: "pan_card", type: "document", title: "PAN Card", chatText: "Mandatory tax ID for the business entity.", actionLink: null, prerequisites: [] }
            }
          }
        }));
      }
    }, 3000);
  });
});