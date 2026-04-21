"use client";

import { useState, useCallback, JSX } from "react";
import ReactFlow, {
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
} from "reactflow";
import "reactflow/dist/style.css";
import ImageNode from "../_components/ImageNode";
import TextNode from "../_components/TextNode";
import VideoNode from "../_components/VideoNode";

type NodeType = "text" | "image" | "video" | "llm" | "crop" | "frame";

const nodesList: { id: NodeType; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "image", label: "Upload Image" },
  { id: "video", label: "Upload Video" },
  { id: "llm", label: "LLM" },
  { id: "crop", label: "Crop Image" },
  { id: "frame", label: "Extract Frame" },
];

const nodeTypes = {
  imageNode: ImageNode,
  textNode: TextNode,
  videoNode: VideoNode,
};

export default function WorkflowPage(): JSX.Element {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);

  const nodeTypeMap: Record<NodeType, string> = {
    image: "imageNode",
    text: "textNode",
    video: "videoNode",
    llm: "default",
    crop: "default",
    frame: "default",
  };

  const addNode = (type: NodeType): void => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type: nodeTypeMap[type],
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      },
      data: { label: type },
    };

    setNodes((prev) => [...prev, newNode]);
  };

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onNodeContextMenu = (event: React.MouseEvent, node: Node) => {
    event.preventDefault();

    setMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
    });
  };

  const deleteNode = () => {
    if (!menu) return;

    setNodes((nds) => nds.filter((n) => n.id !== menu.nodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== menu.nodeId && e.target !== menu.nodeId),
    );

    setMenu(null);
  };

  return (
    <div className="w-full h-screen flex bg-black text-white">
      <div className="w-64 border-r border-zinc-800 p-4 flex flex-col gap-3">
        <input
          placeholder="Search nodes..."
          className="bg-zinc-900 p-2 rounded text-sm outline-none"
        />
        <div className="flex flex-col gap-2 mt-2">
          {nodesList.map((n) => (
            <button
              key={n.id}
              onClick={() => addNode(n.id)}
              className="bg-zinc-900 hover:bg-zinc-800 p-2 rounded text-left text-sm"
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={() => setMenu(null)}
          onNodeDragStart={() => setMenu(null)}
        >
          <Background gap={16} size={1} />
          <MiniMap className="rounded-xl" />
        </ReactFlow>
      </div>

      {menu && (
        <div
          className="fixed bg-[#0b0b0b] border border-white/10 rounded-xl shadow-xl p-2 text-sm z-50"
          style={{ top: menu.y, left: menu.x }}
          onClick={() => setMenu(null)}
        >
          <button
            onClick={deleteNode}
            className="block w-full text-left px-4 py-2 text-red-400"
          >
            Delete
          </button>
        </div>
      )}

      <div className="w-72 border-l border-zinc-800 p-4 flex flex-col gap-3">
        <div className="text-sm font-semibold">History</div>
      </div>
    </div>
  );
}
