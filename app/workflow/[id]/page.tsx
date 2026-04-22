"use client";

import { useState, useCallback, JSX, useEffect } from "react";
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
import ImageNode from "../../_components/ImageNode";
import TextNode from "../../_components/TextNode";
import VideoNode from "../../_components/VideoNode";
import CropNode from "../../_components/CropNode";
import LLMNode from "../../_components/LLMNode";
import ExtractFrameNode from "../../_components/ExtractFrameNode";
import { Clock10 } from "lucide-react";
import PulseEdge from "@/app/_components/PulseEdge";

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
  const [history, setHistory] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [name, setName] = useState("Untitled Workflow");
  const edgeTypes = {
    pulse: PulseEdge,
  };

  const nodeTypeMap: Record<NodeType, string> = {
    image: "imageNode",
    text: "textNode",
    video: "videoNode",
    llm: "llmNode",
    crop: "cropNode",
    frame: "extractFrame",
  };

  const addNode = (type: NodeType): void => {
    const id = `${type}-${Date.now()}`;

    const newNode: Node = {
      id,
      type: nodeTypeMap[type],
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      },
      data: {
        label: type,
        prompt: "",
        onChange: (value: string) => {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, prompt: value } } : n,
            ),
          );
        },
      },
    };

    setNodes((prev) => [...prev, newNode]);
  };

  const onConnect = useCallback((params: Connection) => {
    if (params.source === params.target) return;

    setEdges((eds) => {
      const exists = eds.some(
        (e) => e.source === params.source || e.target === params.target,
      );

      if (exists) return eds;

      return addEdge(params, eds);
    });
  }, []);

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

    const deleted = nodes.find((n) => n.id === menu.nodeId);

    setNodes((nds) => nds.filter((n) => n.id !== menu.nodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== menu.nodeId && e.target !== menu.nodeId),
    );

    setHistory((prev) => [
      { type: "DELETE_NODE", node: deleted, time: Date.now() },
      ...prev,
    ]);

    setMenu(null);
  };

  const runNode = (node: Node) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === node.id ? { ...n, data: { ...n.data, running: true } } : n,
      ),
    );

    setEdges((eds) =>
      eds.map((e) => (e.source === node.id ? { ...e, type: "pulse" } : e)),
    );

    setEdges((eds) => {
      const nextEdges = eds.filter((e) => e.source === node.id);

      nextEdges.forEach((edge, i) => {
        setTimeout(
          () => {
            setNodes((currentNodes) => {
              const nextNode = currentNodes.find((n) => n.id === edge.target);
              if (nextNode) runNode(nextNode);
              return currentNodes;
            });
          },
          1200 * (i + 1),
        );
      });

      return eds;
    });

    setTimeout(() => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id ? { ...n, data: { ...n.data, running: false } } : n,
        ),
      );

      setEdges((eds) =>
        eds.map((e) => (e.source === node.id ? { ...e, type: "default" } : e)),
      );
    }, 1200);
  };

  const getNodePosition = (id: string) => {
    const el = document.querySelector(`[data-id="${id}"]`);
    if (!el) return null;

    const rect = el.getBoundingClientRect();

    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
    };
  };

  const pos = selectedNode ? getNodePosition(selectedNode.id) : null;

  useEffect(() => {
    const selected = nodes.find((n) => n.selected);
    setSelectedNode(selected || null);
  }, [nodes]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;

      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Backspace") {
        deleteNode();
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => window.removeEventListener("keydown", handleKey);
  }, [menu, nodes]);

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

  const saveWorkflow = async () => {
    const workflowId = window.location.pathname.split("/").pop();

    await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/workflow/${workflowId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          nodes,
          edges,
          history,
        }),
      },
    );
  };

  useEffect(() => {
    if (!nodes.length && !edges.length) return;

    const timeout = setTimeout(() => {
      saveWorkflow();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [nodes, edges, name]);

  const loadWorkflow = async () => {
    const id = window.location.pathname.split("/").pop();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/workflow/single/${id}`,
    );

    const data = await res.json();

    const attachHandlers = (nodes: Node[]) => {
      return nodes.map((node) => {
        if (node.type === "textNode") {
          return {
            ...node,
            data: {
              ...node.data,
              onChange: (value: string) => {
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === node.id
                      ? { ...n, data: { ...n.data, prompt: value } }
                      : n,
                  ),
                );
              },
            },
          };
        }

        return node;
      });
    };

    setNodes(attachHandlers(data.nodes || []));
    setEdges(data.edges || []);
    setName(data.name || "Untitled Workflow");
    setHistory(data.history || []);
  };

  useEffect(() => {
    loadWorkflow();
  }, []);

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
          edgeTypes={edgeTypes}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeClick={(_, edge) => {
            setEdges((eds) => eds.filter((e) => e.id !== edge.id));
          }}
          onEdgesDelete={(deletedEdges) => {
            setEdges((eds) => eds.filter((e) => !deletedEdges.includes(e)));
          }}
          onConnect={onConnect}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={() => {
            setMenu(null);
            setSelectedNode(null);
          }}
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
          {pos && (
            <div
              className="fixed z-50"
              style={{
                top: pos.top - 10,
                left: pos.left + pos.width - 90,
              }}
            >
              <button
                onClick={() => runNode(selectedNode!)}
                className="bg-[#111] hover:bg-[#1a1a1a] px-3 py-1.5 rounded-md text-xs text-white/80 shadow border border-white/10"
              >
                ▶ Run node
              </button>
            </div>
          )}
          <div className="absolute top-0 left-0 z-50">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-4 py-2  text-sm text-white bg-black/40 backdrop-blur-md border border-white/10 rounded-md mt-8 ml-5 outline-none"
            />
          </div>
          <Background gap={20} size={2} />
          {/* <MiniMap className="rounded-xl" /> */}
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
          {history.map((h, i) => (
            <div
              key={i}
              className="text-xs text-white/70 bg-white/5 p-2 rounded"
            >
              {h.type === "ADD_NODE" && `Added ${h.node.type}`}
              {h.type === "DELETE_NODE" && `Deleted ${h.node?.type}`}
              {h.type === "CONNECT" && `Connected nodes`}
            </div>
          ))}
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
