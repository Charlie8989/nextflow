"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { LogOut, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, JSX } from "react";
import { exampleWorkflows, ExampleWorkflow } from "@/app/_data/exampleWorkflows";
import ReactFlow, {
  Background,
  Edge,
  Handle,
  Node as FlowNode,
  NodeProps,
  Position,
  useEdgesState,
  useNodesState,
  MiniMap,
} from "reactflow";
import "reactflow/dist/style.css";

type PreviewNodeData = {
  label: string;
  model?: string;
  image?: string;
  prompt?: string;
  variant: "image" | "prompt" | "output";
};

type WorkflowSummary = {
  id: string;
  name?: string;
  image?: string;
  nodes?: Array<{
    type?: string;
    data?: Record<string, any>;
  }>;
  updatedAt?: string;
};

type DashboardTab = "projects" | "examples";

type WorkflowThumbnail =
  | { kind: "image"; src: string }
  | { kind: "video"; src: string }
  | { kind: "generated"; label: string; tilt: number; shade: number };

const hashString = (value: string) => {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }

  return Math.abs(hash);
};

const isUsableImage = (value?: string) =>
  Boolean(
    value &&
      (value.startsWith("data:image/") ||
        /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(value)),
  );

const isUsableVideo = (value?: string) =>
  Boolean(
    value &&
      (value.startsWith("data:video/") ||
        /\.(mp4|mov|webm|mpeg|mpg|avi|wmv|3gp)(\?|$)/i.test(value)),
  );

const getBackendUrl = () => {
  const configured = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();

  if (!configured) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
  }

  return configured.replace(/\/$/, "");
};

const getApiUrl = (path: string) => `${getBackendUrl()}${path}`;

const readApiError = async (res: Response) => {
  const text = await res.text().catch(() => "");

  try {
    return JSON.parse(text)?.error || text || `Request failed: ${res.status}`;
  } catch {
    return text || `Request failed: ${res.status}`;
  }
};

const fetchApiJson = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  let res: Response;

  try {
    res = await fetch(getApiUrl(path), init);
  } catch {
    throw new Error(`Could not reach backend at ${getBackendUrl()}`);
  }

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }

  return res.json() as Promise<T>;
};

const getWorkflowThumbnail = (workflow: WorkflowSummary): WorkflowThumbnail => {
  if (workflow.image && isUsableImage(workflow.image)) {
    return { kind: "image", src: workflow.image };
  }

  const nodes = workflow.nodes || [];
  const mediaValues = nodes.flatMap((node) => {
    const data = node.data || {};

    return [
      data.uploadedImage,
      data.image,
      data.output,
      data.uploadedVideo,
      data.video,
    ].filter((value): value is string => typeof value === "string" && value !== "")
  });
  const image = mediaValues.find(isUsableImage);

  if (image) {
    return { kind: "image", src: image };
  }

  const video = mediaValues.find(isUsableVideo);

  if (video) {
    return { kind: "video", src: video };
  }

  const hash = hashString(`${workflow.id}-${workflow.updatedAt || workflow.name}`);
  const label =
    nodes
      .map((node) => String(node.data?.label || node.type || ""))
      .find(Boolean)
      ?.slice(0, 2)
      .toUpperCase() || "WF";

  return {
    kind: "generated",
    label,
    tilt: (hash % 7) - 3,
    shade: hash % 4,
  };
};

function WorkflowCardThumbnail({
  thumbnail,
}: {
  thumbnail: WorkflowThumbnail;
}): JSX.Element {
  if (thumbnail.kind === "image") {
    return (
      <img
        src={thumbnail.src}
        alt=""
        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
      />
    );
  }

  if (thumbnail.kind === "video") {
    return (
      <video
        src={thumbnail.src}
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
      />
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b0b0b]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:26px_26px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_58%)]" />
      <div
        className="absolute left-1/2 top-1/2 h-[112px] w-[148px] -translate-x-1/2 -translate-y-1/2 rounded-md border border-black/10 bg-[#ece8df] shadow-2xl shadow-black/50"
        style={{
          transform: `translate(-50%, -50%) rotate(${thumbnail.tilt}deg)`,
          filter: `brightness(${1 - thumbnail.shade * 0.03})`,
        }}
      >
        <div className="absolute inset-0 rounded-md bg-[linear-gradient(135deg,rgba(255,255,255,0.5),transparent_38%),linear-gradient(0deg,rgba(0,0,0,0.06),transparent_60%)]" />
        <div className="absolute inset-3 rounded-sm border border-black/5 bg-white/25" />
        <div className="absolute bottom-3 left-3 right-3 h-2 rounded-full bg-black/10" />
      </div>
      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-md border border-white/10 bg-black/45 px-2.5 py-2 text-white shadow-lg">
        <span className="flex size-7 items-center justify-center rounded bg-white text-[10px] font-semibold text-black">
          {thumbnail.label}
        </span>
        <span className="h-2 w-16 rounded-full bg-white/25" />
      </div>
    </div>
  );
}

function PreviewNode({ data }: NodeProps<PreviewNodeData>): JSX.Element {
  if (data.variant === "prompt") {
    return (
      <div className="relative w-[380px] rounded-[22px] bg-[#151515] px-6 py-5 text-white shadow-2xl shadow-black/40 ring-1 ring-white/5">
        <div className="absolute -top-6 left-0 text-sm font-semibold uppercase text-white/45">
          {data.label}
        </div>
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2 !w-2 !border-0 !bg-white"
        />
        <p className="text-xl leading-snug text-white/80">{data.prompt}</p>
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2 !w-2 !border-0 !bg-white"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-visible rounded-[10px] bg-[#2a2a2a] p-[6px] shadow-2xl shadow-black/50 ${
        data.variant === "output" ? "w-[545px]" : "w-[260px]"
      }`}
    >
      <div className="absolute -top-7 left-2 right-2 flex items-center justify-between text-sm font-semibold uppercase text-white/55">
        <span>{data.label}</span>
        {data.model && <span className="text-white/80">{data.model}</span>}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-white"
      />
      <img
        src={data.image}
        alt={data.label}
        className={`w-full rounded-[6px] object-cover ${
          data.variant === "output" ? "h-[715px]" : "h-[325px]"
        }`}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !bg-white"
      />
    </div>
  );
}

const landingNodeTypes = {
  preview: PreviewNode,
};

function LandingHome({
  onGetStarted,
}: {
  onGetStarted: () => void;
}): JSX.Element {
  const initialNodes: FlowNode<PreviewNodeData>[] = [
    {
      id: "uploaded",
      type: "preview",
      position: { x: 225, y: 84 },
      data: {
        label: "Uploaded",
        image: "/images/model-home.webp",
        variant: "image",
      },
    },
    {
      id: "color",
      type: "preview",
      position: { x: 74, y: 520 },
      data: {
        label: "Color",
        image: "/images/pastel-pink.webp",
        variant: "image",
      },
    },
    {
      id: "flux",
      type: "preview",
      position: { x: 246, y: 710 },
      data: {
        label: "Flux",
        model: "Flux",
        image: "/images/bg-fur.webp",
        variant: "image",
      },
    },
    {
      id: "image",
      type: "preview",
      position: { x: 475, y: 300 },
      data: {
        label: "Image",
        model: "Nano Banana",
        image: "/images/bg-prompt.webp",
        variant: "image",
      },
    },
    {
      id: "prompt",
      type: "preview",
      position: { x: 830, y: 328 },
      data: {
        label: "Prompt",
        prompt:
          "A girl sits down on a soft floor, and cats walk in from off-screen toward",
        variant: "prompt",
      },
    },
    {
      id: "video",
      type: "preview",
      position: { x: 1305, y: 140 },
      data: {
        label: "Video",
        model: "Sora 2",
        image: "/images/final-home.webp",
        variant: "output",
      },
    },
  ];

  const initialEdges: Edge[] = [
    {
      id: "uploaded-video",
      source: "uploaded",
      target: "video",
      type: "smoothstep",
      style: { stroke: "#2b2b2b", strokeWidth: 3 },
    },
    {
      id: "color-image",
      source: "color",
      target: "image",
      type: "smoothstep",
      style: { stroke: "#2b2b2b", strokeWidth: 3 },
    },
    {
      id: "flux-image",
      source: "flux",
      target: "image",
      type: "smoothstep",
      style: { stroke: "#2b2b2b", strokeWidth: 3 },
    },
    {
      id: "image-prompt",
      source: "image",
      target: "prompt",
      type: "smoothstep",
      style: { stroke: "#2b2b2b", strokeWidth: 3 },
    },
    {
      id: "prompt-video",
      source: "prompt",
      target: "video",
      type: "smoothstep",
      style: { stroke: "#2b2b2b", strokeWidth: 3 },
    },
  ];

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <main className="relative max-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={landingNodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          preventScrolling
          fitView
          fitViewOptions={{ padding: 0.08 }}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type: "smoothstep",
            style: { stroke: "#2b2b2b", strokeWidth: 3 },
          }}
        >
          <Background color="#171717" gap={45} size={2} />
        </ReactFlow>
      </div>

      <section className="pointer-events-none relative z-10 mx-auto flex min-h-screen max-w-[720px] flex-col items-center justify-end px-6 pb-[9vh] pt-24 text-center">
      
        <h1 className="text-[72px] font-normal leading-none tracking-normal text-white md:text-[78px]">
          Nodes
        </h1>
        <p className="mt-7 max-w-[610px] text-xl font-medium leading-snug text-white/75">
          Automate manual steps in your creative process with Krea&apos;s node-based
          workflow builder. Create reusable, scalable, and sharable workflows.
        </p>
        <button
          onClick={onGetStarted}
          className="pointer-events-auto mt-14 h-[60px] w-[270px] rounded-full bg-white text-lg font-semibold text-black shadow-xl shadow-black/30 transition hover:bg-white/90"
        >
          Get Started
        </button>
      </section>
    </main>
  );
}

function DashboardHome(): JSX.Element {
  const router = useRouter();
  const { isSignedIn, user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const [open, setOpen] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("projects");
  const [dashboardError, setDashboardError] = useState("");
  const desktopAccountRef = useRef<HTMLDivElement>(null);
  const mobileAccountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as globalThis.Node;
      const clickedDesktopAccount = desktopAccountRef.current?.contains(target);
      const clickedMobileAccount = mobileAccountRef.current?.contains(target);

      if (!clickedDesktopAccount && !clickedMobileAccount) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);

  const createWorkflow = async () => {
    if (!user) return;

    const data = await fetchApiJson<{ id: string }>("/api/workflow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerkId: user.id,
        name: "Untitled Workflow",
        nodes: [],
        edges: [],
      }),
    });

    router.push(`/workflow/${data.id}`);
  };

  const handleStart = async (): Promise<void> => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    try {
      setDashboardError("");
      await createWorkflow();
    } catch (error: any) {
      setDashboardError(error?.message || "Could not create workflow.");
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchApiJson("/api/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        imageUrl: user.imageUrl,
      }),
    }).catch((error: any) => {
      setDashboardError(error?.message || "Could not sync user profile.");
    });
  }, [user]);

  useEffect(() => {
    if (!isLoaded || !user) return;

    void fetchApiJson<WorkflowSummary[]>(`/api/workflow/${user.id}`)
      .then((data: WorkflowSummary[]) => {
        setWorkflows(data || []);
        setDashboardError("");
      })
      .catch((error: any) => {
        setDashboardError(error?.message || "Could not load workflows.");
      });
  }, [isLoaded, user]);

  const handleLogOut = async (): Promise<void> => {
    setOpen(false);
    await signOut({ redirectUrl: "/" });
  };

  const accountLabel =
    user?.username || user?.primaryEmailAddress?.emailAddress || user?.fullName;

  const handleDelete = async (id: string) => {
    try {
      await fetchApiJson(`/api/workflow/${id}`, {
        method: "DELETE",
      });

      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      setDashboardError("");
    } catch (error: any) {
      setDashboardError(error?.message || "Could not delete workflow.");
    }
  };

  const openExampleWorkflow = async (example: ExampleWorkflow) => {
    if (!user) return;

    const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
    try {
      const data = await fetchApiJson<{ id: string }>("/api/workflow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkId: user.id,
          name: example.name,
          description: example.description,
          nodes: clone(example.nodes),
          edges: clone(example.edges),
        }),
      });

      setDashboardError("");
      router.push(`/workflow/${data.id}`);
    } catch (error: any) {
      setDashboardError(error?.message || "Could not open example workflow.");
    }
  };

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-black text-white">
      {dashboardError && (
        <div className="fixed right-4 top-4 z-[100] w-[min(360px,calc(100vw-2rem))] rounded-lg border border-red-400/40 bg-red-950/95 p-4 text-sm text-red-50 shadow-2xl shadow-black/50">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-red-200">
              Backend error
            </span>
            <button
              type="button"
              onClick={() => setDashboardError("")}
              className="rounded px-1.5 text-red-100/70 hover:bg-red-900 hover:text-red-50"
              aria-label="Dismiss backend error"
            >
              x
            </button>
          </div>
          <p className="leading-relaxed">{dashboardError}</p>
        </div>
      )}

      <div className="relative hidden h-screen w-[72px] shrink-0 flex-col items-center border-r border-white/10 bg-[#0b0b0b] py-4 md:flex">
        <div className="relative mt-auto" ref={desktopAccountRef}>
          {isLoaded && user ? (
            <img
              src={user.imageUrl}
              alt="Account"
              onClick={() => setOpen((p) => !p)}
              className="h-10 w-10 cursor-pointer rounded-xl object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-white/10" />
          )}

          {open && (
            <div className="absolute bottom-6 left-8 z-50 w-64 rounded-xl border border-white/10 bg-[#0b0b0b] p-3 shadow-xl">
              <div className="mb-3">
                <p className="text-sm text-white/80">Workspaces</p>

                <div className="mt-2 rounded-lg bg-white/5 p-2">
                  <p className="text-sm font-medium">
                    {accountLabel}
                  </p>
                  <p className="text-xs text-white/50">Free</p>
                </div>

                {/* <button className="mt-2 text-sm text-white/70 hover:text-white">
                  + Add workspace
                </button> */}
              </div>

              {/* <div className="my-3 border-t border-white/10" /> */}
{/* 
              <div className="mb-3 rounded-lg bg-black p-3">
                <p className="text-sm">39 Credits remaining</p>
                <p className="text-xs text-white/50">100 per day</p>
              </div>

              <div className="flex flex-col gap-2 text-sm text-white/80">
                <button className="text-left hover:text-white">
                  Upgrade plan
                </button>
                <button className="text-left hover:text-white">
                  Buy credits
                </button>
                <button className="text-left hover:text-white">Settings</button>
                <button className="text-left hover:text-white">
                  Usage Statistics
                </button>
              </div> */}

              <div className="my-3 border-t border-white/10" />

              <button
                onClick={handleLogOut}
                className="text-left text-sm text-red-400 hover:text-red-500"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="relative flex h-[280px] shrink-0 items-center md:h-[300px]">
          <img
            src="/images/hero-image.webp"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-black/40" />

          <div
            ref={mobileAccountRef}
            className="absolute right-4 top-4 z-20 md:hidden"
          >
            {isLoaded && user ? (
              <button
                type="button"
                onClick={() => setOpen((p) => !p)}
                className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-black/45 shadow-lg"
                aria-label="Open account menu"
              >
                <img
                  src={user.imageUrl}
                  alt="Account"
                  className="h-full w-full object-cover"
                />
              </button>
            ) : (
              <div className="h-11 w-11 rounded-xl bg-white/10" />
            )}

            {open && (
              <div className="absolute right-0 top-14 w-[min(260px,calc(100vw-2rem))] rounded-xl border border-white/10 bg-[#0b0b0b] p-3 shadow-2xl shadow-black/60">
                <div className="rounded-lg bg-white/5 p-3">
                  <p className="truncate text-sm font-medium">
                    {accountLabel || "Account"}
                  </p>
                  <p className="mt-1 text-xs text-white/50">Free</p>
                </div>

                <button
                  type="button"
                  onClick={handleLogOut}
                  className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200"
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </div>
            )}
          </div>

          <div className="relative z-10 mx-8 max-w-2xl px-6 md:mx-12 md:px-12">
            <div className="mb-6 flex items-center gap-3">
              <img
                src="/images/nodes.webp"
                alt=""
                className="h-10 w-10 md:h-10 md:w-10"
              />
              <p className="text-sm font-light md:text-3xl">Node Editor</p>
            </div>

            <p className="mb-8 leading-relaxed text-white/80">
              Nodes is the most powerful way to operate Krea. Connect every tool
              and model into complex automated pipelines.
            </p>

            <button
              onClick={createWorkflow}
              className="rounded-full bg-white px-6 py-2 text-sm font-medium text-black md:px-8 md:py-2"
            >
              New Workflow →
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-black to-[#050505]">
          <div className="shrink-0 px-6 pb-6 pt-8 md:px-10 md:pb-8 md:pt-10">
            <div className="node-scroll flex gap-4 overflow-x-auto text-white/70 md:gap-6">
            <button
              onClick={() => setActiveTab("projects")}
              className={`whitespace-nowrap rounded-lg px-4 py-2 ${
                activeTab === "projects" ? "bg-white/10 text-white" : ""
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => setActiveTab("examples")}
              className={`whitespace-nowrap rounded-lg px-4 py-2 ${
                activeTab === "examples" ? "bg-white/10 text-white" : ""
              }`}
            >
              Examples
            </button>
            </div>
          </div>

          <div className="node-scroll min-h-0 flex-1 overflow-y-auto px-6 pb-8 md:px-10">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
              {activeTab === "projects" && (
                <div
                  onClick={handleStart}
                  className="flex h-40 cursor-pointer items-center justify-center rounded-xl bg-white/5 hover:bg-white/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl text-black">
                    +
                  </div>
                </div>
              )}

              {activeTab === "projects" && workflows.map((wf) => (
                <div
                  key={wf.id}
                  onClick={() => router.push(`/workflow/${wf.id}`)}
                  className="group cursor-pointer"
                >
                  <div className="relative h-40 overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-lg shadow-black/20">
                    <WorkflowCardThumbnail thumbnail={getWorkflowThumbnail(wf)} />

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 opacity-80" />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(wf.id);
                      }}
                      className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white shadow hover:bg-red-500"
                      aria-label="Delete workflow"
                      title="Delete workflow"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <p className="mt-2 text-sm font-medium">
                    {wf.name || "Untitled"}
                  </p>

                  <p className="text-xs text-white/50">
                    Edited {wf.updatedAt ? new Date(wf.updatedAt).toLocaleString() : "N/A"}
                  </p>
                </div>
              ))}

              {activeTab === "examples" && exampleWorkflows.map((example) => (
                <div
                  key={example.id}
                  onClick={() => openExampleWorkflow(example)}
                  className="group cursor-pointer"
                >
                  <div className="relative h-40 overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-lg shadow-black/20">
                    <WorkflowCardThumbnail
                      thumbnail={getWorkflowThumbnail(example)}
                    />

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 opacity-80" />
                  </div>

                  <p className="mt-2 text-sm font-medium">{example.name}</p>

                  {example.description && (
                    <p className="text-xs text-white/50">
                      {example.description}
                    </p>
                  )}
                </div>
              ))}

              {deleteId && (
                <div
                  onClick={() => setDeleteId(null)}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
                >
                  <div className="w-80 rounded-xl border border-white/10 bg-[#0b0b0b] p-6">
                    <h2 className="mb-2 text-lg">Delete Workflow?</h2>
                    <p className="mb-4 text-sm text-white/50">
                      This action cannot be undone.
                    </p>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setDeleteId(null)}
                        className="rounded-lg bg-white/10 px-4 py-2 text-sm"
                      >
                        Cancel
                      </button>

                      <button
                        onClick={async () => {
                          await handleDelete(deleteId);
                          setDeleteId(null);
                        }}
                        className="rounded-lg bg-red-500 px-4 py-2 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage(): JSX.Element {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  const handleGetStarted = (): void => {
    router.push("/sign-in");
  };

  if (!isLoaded || !isSignedIn) {
    return <LandingHome onGetStarted={handleGetStarted} />;
  }

  return <DashboardHome />;
}
