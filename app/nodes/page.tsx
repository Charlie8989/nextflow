"use client";

import { useState, useCallback, JSX } from "react";
import { ConnectionLineType } from "reactflow";
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
import CropNode from "../_components/CropNode";
import LLMNode from "../_components/LLMNode";
import ExtractFrameNode from "../_components/ExtractFrameNode";
import { Clock10 } from "lucide-react";

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
  cropNode: CropNode,
  llmNode: LLMNode,
  extractFrame: ExtractFrameNode,
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
    llm: "llmNode",
    crop: "cropNode",
    frame: "extractFrame",
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

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<boolean | null>(false);
  const [historyOpen, setHistoryOpen] = useState<boolean | null>(false);

  const handleSearch = (value: string) => {
    const topResult = filteredNodes[0];
    if (topResult) {
      addNode(topResult.id as NodeType);
    }
  };

  const filteredNodes = nodesList.filter((n) =>
    n.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="w-full h-screen flex bg-black text-white">
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden p-2 text-white"
      >
        ☰
      </button>

      <div
        className={`
        fixed top-0 left-0 h-full w-64 bg-zinc-950 z-50
        transform transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:static md:block
      `}
      >
        <div className="p-4 flex flex-col gap-3">
          <input
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch(search);
              }
            }}
            className="bg-zinc-900 p-2 rounded text-sm outline-none"
          />

          <div className="flex flex-col gap-2 mt-2">
            {filteredNodes.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  addNode(n.id);
                  setOpen(false);
                }}
                className="bg-zinc-900 hover:bg-zinc-800 p-2 rounded text-left text-sm"
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

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
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type: "beizer",
            style: {
              stroke: "#60a5fa",
              strokeWidth: 3,
            },
          }}
          connectionLineStyle={{
            stroke: "#60a5fa",
            strokeWidth: 3,
          }}
          connectionLineType={ConnectionLineType.Bezier}
        >
          <Background gap={20} size={2} />
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
            onKeyDown={(e) => {
              if (e.key === "Backspace") {
                deleteNode();
              }
            }}
            className="block w-full text-left px-4 py-2 text-red-400"
          >
            Delete
          </button>
        </div>
      )}

      <button
        onClick={() => setHistoryOpen(!historyOpen)}
        className="md:hidden p-2 text-white"
      >
        <Clock10 className="text-white" size={10} />
      </button>

      <div
        className={`
      fixed top-0 right-0 h-full w-72 bg-zinc-950 z-50
      transform transition-transform duration-300
      ${historyOpen ? "translate-x-0" : "translate-x-full"}
      md:translate-x-0 md:static md:block
      border-l border-zinc-800
    `}
      >
        <div className="p-4 flex flex-col gap-3 ">
          <div className="text-sm font-semibold">History</div>
        </div>
      </div>

      {historyOpen && (
        <div
          onClick={() => setHistoryOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}
    </div>
  );
}
