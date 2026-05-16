"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useCallback, JSX, useEffect, useRef } from "react";
import { ConnectionLineType, MiniMap } from "reactflow";
import ReactFlow, {
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
} from "reactflow";

type FlowNode = Node<any>;
import "reactflow/dist/style.css";
import ImageNode from "../../_components/ImageNode";
import TextNode from "../../_components/TextNode";
import VideoNode from "../../_components/VideoNode";
import CropNode from "../../_components/CropNode";
import LLMNode from "../../_components/LLMNode";
import ImageGenNode from "../../_components/ImageGenNode";
import VideoGenNode from "../../_components/VideoGenNode";
import ExtractFrameNode from "../../_components/ExtractFrameNode";
import {
  AlertTriangle,
  CheckCircle2,
  Clock10,
  Download,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Redo2Icon,
  Search,
  Timer,
  Trash2,
  Undo2Icon,
  X,
  XCircle,
} from "lucide-react";
import PulseEdge from "@/app/_components/PulseEdge";

type NodeType = "text" | "image" | "video" | "llm" | "crop" | "frame";

type RunStatus = "success" | "failed" | "partial" | "running" | "stopped";
type RunScope = "full" | "partial" | "single";

type NodeRunHistory = {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  status: RunStatus;
  inputs: Record<string, string>;
  output: string;
  durationMs: number;
  error?: string;
};

type WorkflowRunHistory = {
  id: string;
  number: number;
  type: "WORKFLOW_RUN";
  startedAt: number;
  endedAt?: number;
  status: RunStatus;
  scope: RunScope;
  scopeLabel: string;
  durationMs: number;
  nodeRuns: NodeRunHistory[];
};

type WorkflowHistoryState = {
  runs?: WorkflowRunHistory[];
  events?: any[];
  [key: string]: any;
};

const nodesList: { id: NodeType; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "image", label: "Upload Image" },
  { id: "video", label: "Upload Video" },
  { id: "llm", label: "LLM" },
  { id: "crop", label: "Crop Image" },
  { id: "frame", label: "Extract Frame" },
];

const UI_STORAGE_KEYS = {
  leftCollapsed: "nextflow.workflow.leftCollapsed",
  rightCollapsed: "nextflow.workflow.rightCollapsed",
};

const INITIAL_WORKFLOW_VIEWPORT = { x: 0, y: 0, zoom: 0.5 };
const WORKFLOW_FIT_VIEW_OPTIONS = { padding: 0.28, maxZoom: 0.62 };

const nodeTypes = {
  imageNode: ImageNode,
  textNode: TextNode,
  videoNode: VideoNode,
  cropNode: CropNode,
  llmNode: LLMNode,
  imageGenNode: ImageGenNode,
  videoGenNode: VideoGenNode,
  extractFrame: ExtractFrameNode,
};

const visualNodeTypes = new Set([
  "imageNode",
  "videoNode",
  "cropNode",
  "extractFrame",
  "imageGenNode",
  "videoGenNode",
]);

const textNodeTypes = new Set(["textNode", "llmNode"]);

const getBackendUrl = () => {
  const configured = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();

  if (!configured) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
  }

  return configured.replace(/\/$/, "");
};

const getWorkflowIdFromPath = () =>
  window.location.pathname.split("/").filter(Boolean).pop() || "";

export default function WorkflowPage(): JSX.Element {
  const router = useRouter();
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser();
  const [nodes, setNodes, rawOnNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, rawOnEdgesChange] = useEdgesState<Edge[]>([]);
  const nodesRef = useRef<FlowNode[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const [history, setHistory] = useState<WorkflowHistoryState>({ runs: [] });
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [uiError, setUiError] = useState("");
  const [quotaDialog, setQuotaDialog] = useState("");
  const [accessError, setAccessError] = useState("");
  const [hasWorkflowAccess, setHasWorkflowAccess] = useState(false);
  const stopWorkflowRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const runOutputsRef = useRef<Record<string, string>>({});
  const executedRunNodesRef = useRef<Set<string>>(new Set());
  const currentRunRef = useRef<WorkflowRunHistory | null>(null);
  const lastUiErrorRef = useRef("");
  const flowWrapperRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const viewportRef = useRef(INITIAL_WORKFLOW_VIEWPORT);
  const undoStackRef = useRef<{ nodes: FlowNode[]; edges: Edge[] }[]>([]);
  const redoStackRef = useRef<{ nodes: FlowNode[]; edges: Edge[] }[]>([]);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [name, setName] = useState("Untitled Workflow");
  const edgeTypes = {
    pulse: PulseEdge,
  };

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const getTransloaditUrl = (result: any) => {
    const results = result?.results;

    if (!results) return null;

    const file =
      results.compress?.[0] ||
      results.encode?.[0] ||
      Object.values(results)
        .flat()
        .find((item: any) => item?.ssl_url || item?.url);

    return (file as any)?.ssl_url || (file as any)?.url || null;
  };

  const getTransloaditCreateUrl = (uploadUrl?: string | null) => {
    if (!uploadUrl) {
      return "https://api2.transloadit.com/assemblies";
    }

    try {
      const url = new URL(uploadUrl);

      if (
        url.hostname.endsWith(".transloadit.com") &&
        /^\/assemblies\/[^/]+$/.test(url.pathname)
      ) {
        return `${url.protocol}//${url.hostname}/assemblies`;
      }

      return uploadUrl;
    } catch {
      return "https://api2.transloadit.com/assemblies";
    }
  };

  const uploadVideo = async (file: File) => {
    // console.log("[video-upload] start", {
    //   name: file.name,
    //   size: file.size,
    //   type: file.type,
    //   backendUrl: getBackendUrl(),
    // });

    const res = await fetch(`${getBackendUrl()}/api/video/upload-url`);
    const data = await res.json();
    // console.log("[video-upload] config response", {
    //   status: res.status,
    //   ok: res.ok,
    //   data,
    // });

    const uploadUrl = getTransloaditCreateUrl(data.uploadUrl);
    const params = data.params;
    const signature = data.signature;

    if (!uploadUrl || !params) {
      console.error("[video-upload] missing upload config", {
        uploadUrl,
        hasParams: Boolean(params),
        hasSignature: Boolean(signature),
      });
      throw new Error("Upload URL or params missing");
    }

    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append(
      "params",
      typeof params === "string" ? params : JSON.stringify(params),
    );
    if (signature) {
      formData.append("signature", signature);
    }

    // console.log("[video-upload] transloadit request", {
    //   uploadUrl,
    //   normalizedFrom: data.uploadUrl,
    //   hasSignature: Boolean(signature),
    // });

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("[video-upload] transloadit upload failed", {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        body: errorText,
      });
      throw new Error(
        `Video upload failed: ${uploadResponse.status}${errorText ? ` ${errorText}` : ""}`,
      );
    }

    const uploadData = await uploadResponse.json();
    const assemblyId = uploadData?.assembly_id;
    // console.log("[video-upload] transloadit upload success", {
    //   assemblyId,
    //   uploadData,
    // });

    if (!assemblyId) {
      console.error("[video-upload] missing assembly id", { uploadData });
      throw new Error("Video upload assembly ID missing");
    }

    let result;
    for (let i = 0; i < 20; i++) {
      const pollRes = await fetch(
        `https://api2.transloadit.com/assemblies/${assemblyId}?fields=uploads,results,error,ok`,
      );

      result = await pollRes.json();
      // console.log("[video-upload] poll", {
      //   attempt: i + 1,
      //   status: pollRes.status,
      //   ok: pollRes.ok,
      //   assemblyId,
      //   result,
      // });

      if (result?.error) {
        console.error("[video-upload] assembly error", result);
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : JSON.stringify(result.error),
        );
      }

      if (result?.ok === "ASSEMBLY_COMPLETED") {
        break;
      }

      await new Promise((r) => setTimeout(r, 2000));
    }

    const transloaditUrl = getTransloaditUrl(result);
    // console.log("[video-upload] transloadit result url", {
    //   assemblyId,
    //   transloaditUrl,
    //   result,
    // });

    if (!transloaditUrl) {
      console.error("[video-upload] missing transloadit result url", {
        assemblyId,
        result,
      });
      throw new Error("No video URL from Transloadit");
    }

    // console.log("[video-upload] copying to supabase", {
    //   assemblyId,
    //   transloaditUrl,
    // });
    const supabaseRes = await fetch(`${getBackendUrl()}/upload-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileUrl: transloaditUrl }),
    });

    if (!supabaseRes.ok) {
      const errorText = await supabaseRes.text();
      console.error("[video-upload] supabase copy failed", {
        status: supabaseRes.status,
        statusText: supabaseRes.statusText,
        body: errorText,
      });
      throw new Error(getBackendErrorMessage(supabaseRes.status, errorText));
    }

    const supabaseData = await supabaseRes.json();
    // console.log("[video-upload] complete", {
    //   assemblyId,
    //   supabaseData,
    // });

    if (!supabaseData.url) {
      console.error("[video-upload] missing final video url", { supabaseData });
      throw new Error("Video upload did not return a URL");
    }

    return supabaseData.url;
  };

  const uploadImage = async (file: File) => {
    const res = await fetch(`${getBackendUrl()}/api/image/upload-url`);

    const data = await res.json();

    const uploadUrl = data.uploadUrl;
    const assemblyId = data.assemblyId;
    const params = data.params;
    const signature = data.signature;

    if (!uploadUrl || !assemblyId) {
      throw new Error("Upload URL or Assembly ID missing");
    }

    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append(
      "params",
      typeof params === "string" ? params : JSON.stringify(params),
    );
    if (signature) {
      formData.append("signature", signature);
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(
        `Image upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
      );
    }

    let result;
    for (let i = 0; i < 15; i++) {
      const res = await fetch(
        `https://api2.transloadit.com/assemblies/${assemblyId}?fields=uploads,results`,
      );

      result = await res.json();

      if (result?.ok === "ASSEMBLY_COMPLETED") {
        break;
      }

      await new Promise((r) => setTimeout(r, 2000));
    }

    const transloaditUrl = getTransloaditUrl(result);

    if (!transloaditUrl) throw new Error("No file URL");
    if (!transloaditUrl) {
      throw new Error("No file URL from Transloadit");
    }

    const supabaseRes = await fetch(`${getBackendUrl()}/upload-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileUrl: transloaditUrl }),
    });

    const supabaseData = await supabaseRes.json();

    return supabaseData.url;
  };

  const nodeTypeMap: Record<NodeType, string> = {
    image: "imageNode",
    text: "textNode",
    video: "videoNode",
    llm: "llmNode",
    crop: "cropNode",
    frame: "extractFrame",
  };

  const rememberGraphState = useCallback(() => {
    undoStackRef.current.push({
      nodes: nodesRef.current,
      edges: edgesRef.current,
    });
    if (undoStackRef.current.length > 60) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  }, []);

  const undoGraph = useCallback(() => {
    const previous = undoStackRef.current.pop();
    if (!previous) return;
    redoStackRef.current.push({ nodes, edges });
    setNodes(previous.nodes);
    setEdges(previous.edges);
  }, [edges, nodes, setEdges, setNodes]);

  const redoGraph = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    undoStackRef.current.push({ nodes, edges });
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [edges, nodes, setEdges, setNodes]);

  const onNodesChange = useCallback(
    (changes: any[]) => {
      if (
        changes.some((change) =>
          ["remove", "add"].includes(String(change.type)),
        )
      ) {
        rememberGraphState();
      }
      rawOnNodesChange(changes);
    },
    [rawOnNodesChange, rememberGraphState],
  );

  const onEdgesChange = useCallback(
    (changes: any[]) => {
      if (
        changes.some((change) =>
          ["remove", "add"].includes(String(change.type)),
        )
      ) {
        rememberGraphState();
      }
      rawOnEdgesChange(changes);
    },
    [rawOnEdgesChange, rememberGraphState],
  );

  const getNodeById = (nodeList: FlowNode[], nodeId?: string | null) =>
    nodeList.find((node) => node.id === nodeId);

  const wouldCreateCycle = (
    source: string,
    target: string,
    graphEdges: Edge[] = edges,
  ) => {
    const visited = new Set<string>();
    const stack = [target];

    while (stack.length) {
      const current = stack.pop();
      if (!current || visited.has(current)) continue;
      if (current === source) return true;
      visited.add(current);
      graphEdges
        .filter((edge) => edge.source === current)
        .forEach((edge) => stack.push(edge.target));
    }

    return false;
  };

  const getConnectionError = (
    sourceNode?: FlowNode,
    targetNode?: FlowNode,
    targetHandle?: string | null,
  ) => {
    if (!sourceNode || !targetNode) return "Could not read this connection.";
    if (!targetHandle) return "";

    const sourceType = sourceNode.type || "";
    const targetType = targetNode.type || "";
    const sourceIsVisual = visualNodeTypes.has(sourceType);
    const sourceIsText = textNodeTypes.has(sourceType);

    if (targetType === "llmNode") {
      if (targetHandle === "images" && !sourceIsVisual) {
        return "Connect image, video, crop, or frame output to the LLM images handle.";
      }
      if (
        (targetHandle === "system_prompt" || targetHandle === "user_message") &&
        !sourceIsText
      ) {
        return "Connect a Text or LLM output to this LLM text handle.";
      }
    }

    if (targetType === "cropNode") {
      if (targetHandle === "image_url" && !sourceIsVisual) {
        return "Crop image_url needs an image-producing node.";
      }
      if (targetHandle !== "image_url" && !sourceIsText) {
        return "Crop parameter handles need Text node values.";
      }
    }

    if (targetType === "extractFrame") {
      if (targetHandle === "video_url" && sourceType !== "videoNode" && sourceType !== "videoGenNode") {
        return "Extract Frame video_url needs a video node.";
      }
      if (targetHandle === "timestamp" && !sourceIsText) {
        return "Extract Frame timestamp needs a Text node value.";
      }
    }

    return "";
  };

  const getConnectedInputsForNode = (
    nodeId: string,
    graphEdges: Edge[] = edges,
  ) =>
    graphEdges
      .filter((edge) => edge.target === nodeId && edge.targetHandle)
      .reduce<Record<string, boolean>>((acc, edge) => {
        if (edge.targetHandle) acc[edge.targetHandle] = true;
        return acc;
      }, {});

  const getNextNodePosition = () => {
    const nodeWidth = 320;
    const nodeHeight = 260;
    const margin = 36;
    const wrapperBounds = flowWrapperRef.current?.getBoundingClientRect();
    const viewport = viewportRef.current;
    const visibleWidth = wrapperBounds?.width || window.innerWidth || 1024;
    const visibleHeight = wrapperBounds?.height || window.innerHeight || 720;
    const centerPosition = {
      x: (visibleWidth * 0.5 - viewport.x) / viewport.zoom - nodeWidth * 0.5,
      y: (visibleHeight * 0.46 - viewport.y) / viewport.zoom - nodeHeight * 0.5,
    };

    let position = centerPosition;

    const overlaps = (candidate: { x: number; y: number }) =>
      nodes.some(
        (node) =>
          Math.abs(node.position.x - candidate.x) < nodeWidth - margin &&
          Math.abs(node.position.y - candidate.y) < nodeHeight - margin,
      );

    for (let attempts = 0; attempts < 30 && overlaps(position); attempts += 1) {
      position = {
        x: centerPosition.x + (attempts % 4) * (nodeWidth + margin),
        y:
          centerPosition.y +
          Math.floor(attempts / 4) * (nodeHeight + margin),
      };
    }

    return position;
  };

  const normalizeHistory = (value: any): WorkflowHistoryState => {
    if (value?.runs && Array.isArray(value.runs)) {
      return {
        ...value,
        runs: value.runs,
        events: Array.isArray(value.events) ? value.events : [],
      };
    }

    const legacyEvents = Object.values(value || {})
      .flat()
      .filter((event: any) => event?.type !== "WORKFLOW_RUN");

    return {
      events: legacyEvents,
      runs: [],
    };
  };

  const runHistory = normalizeHistory(history).runs || [];

  const addActivityHistory = (event: any) => {
    setHistory((prev) => {
      const normalized = normalizeHistory(prev);

      return {
        ...normalized,
        events: [
          {
            ...event,
            time: event.time || Date.now(),
          },
          ...(normalized.events || []),
        ].slice(0, 100),
      };
    });
  };

  const getNodeDisplayName = (node: FlowNode) => {
    const rawLabel =
      node.data?.label ||
      node.type?.replace(/Node$/, "") ||
      node.id.split("-")[0] ||
      "Node";

    return String(rawLabel)
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const summarizeHistoryValue = (value: any) => {
    if (value === undefined || value === null || value === "") return "";
    if (typeof value !== "string") return JSON.stringify(value).slice(0, 180);
    if (value.startsWith("data:")) return value.slice(0, 32) + "...";
    return value.length > 180 ? value.slice(0, 177) + "..." : value;
  };

  const captureNodeInputs = (node: FlowNode, incomingOutput: string) => {
    const incoming = getIncomingData(node.id);
    const inputEntries: Record<string, string> = {};

    if (incomingOutput) {
      inputEntries.incoming = summarizeHistoryValue(incomingOutput);
    }

    incoming.forEach((input: any, index) => {
      const value =
        input?.output ||
        input?.uploadedImage ||
        input?.image ||
        input?.uploadedVideo ||
        input?.video ||
        input?.prompt ||
        "";

      if (value) {
        inputEntries[`input_${index + 1}`] = summarizeHistoryValue(value);
      }
    });

    ["prompt", "model", "x", "y", "width", "height", "time", "format"].forEach(
      (key) => {
        const value = summarizeHistoryValue(node.data?.[key]);

        if (value) {
          inputEntries[key] = value;
        }
      },
    );

    return inputEntries;
  };

  const formatDuration = (durationMs = 0) => {
    if (durationMs < 1000) return `${Math.max(durationMs, 0)}ms`;
    return `${(durationMs / 1000).toFixed(1)}s`;
  };

  const formatRunDate = (timestamp: number) =>
    new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(timestamp));

  const getStatusClasses = (status: RunStatus) => {
    if (status === "success") {
      return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
    }

    if (status === "failed") {
      return "border-red-400/25 bg-red-400/10 text-red-200";
    }

    if (status === "running") {
      return "border-yellow-400/25 bg-yellow-400/10 text-yellow-200";
    }

    if (status === "stopped") {
      return "border-zinc-400/25 bg-zinc-400/10 text-zinc-200";
    }

    return "border-yellow-400/25 bg-yellow-400/10 text-yellow-200";
  };

  const getStatusIcon = (status: RunStatus) => {
    if (status === "success") return <CheckCircle2 className="size-3.5" />;
    if (status === "failed") return <XCircle className="size-3.5" />;
    if (status === "stopped") return <XCircle className="size-3.5" />;
    return <Clock10 className="size-3.5" />;
  };

  const beginWorkflowRun = (scope: RunScope, scopeLabel: string) => {
    const previousRuns = normalizeHistory(history).runs || [];
    const nextNumber =
      previousRuns.reduce((max, run) => Math.max(max, run.number || 0), 0) + 1;
    const run: WorkflowRunHistory = {
      id: `run-${Date.now()}`,
      number: nextNumber,
      type: "WORKFLOW_RUN",
      startedAt: Date.now(),
      status: "running",
      scope,
      scopeLabel,
      durationMs: 0,
      nodeRuns: [],
    };

    currentRunRef.current = run;
    setExpandedRunId(run.id);
    setHistory((prev) => {
      const normalized = normalizeHistory(prev);

      return {
        ...normalized,
        runs: [run, ...(normalized.runs || [])].slice(0, 50),
      };
    });
  };

  const commitCurrentRun = () => {
    const run = currentRunRef.current;

    if (!run) return;

    setHistory((prev) => {
      const normalized = normalizeHistory(prev);

      return {
        ...normalized,
        runs: (normalized.runs || []).map((item) =>
          item.id === run.id ? { ...run, nodeRuns: [...run.nodeRuns] } : item,
        ),
      };
    });
  };

  const recordNodeRun = (entry: NodeRunHistory) => {
    const run = currentRunRef.current;

    if (!run) return;

    const existingIndex = run.nodeRuns.findIndex(
      (item) => item.nodeId === entry.nodeId,
    );

    if (existingIndex >= 0) {
      run.nodeRuns[existingIndex] = entry;
    } else {
      run.nodeRuns.push(entry);
    }

    commitCurrentRun();
  };

  const finishWorkflowRun = () => {
    const run = currentRunRef.current;

    if (!run) return;

    const failedCount = run.nodeRuns.filter(
      (nodeRun) => nodeRun.status === "failed",
    ).length;
    const successCount = run.nodeRuns.filter(
      (nodeRun) => nodeRun.status === "success",
    ).length;

    run.endedAt = Date.now();
    run.durationMs = run.endedAt - run.startedAt;
    run.status = stopWorkflowRef.current
      ? "stopped"
      : failedCount === 0
        ? "success"
        : successCount > 0
          ? "partial"
          : "failed";

    commitCurrentRun();
    currentRunRef.current = null;
  };

  const addNode = (
    type: NodeType,
    position = getNextNodePosition(),
  ): void => {
    const id = `${type}-${Date.now()}`;

    const newNode: FlowNode = {
      id,
      type: nodeTypeMap[type],
      position,
      data: {
        label: type,
        prompt: "",
        onDelete: () => deleteNodeById(id),

        ...(type === "video" && {
          running: false,
          uploading: false,
          video: "",
          uploadedVideo: "",
          error: false,
          errorMessage: "",

          onUpload: async (file: File) => {
            const previewUrl = URL.createObjectURL(file);

            setNodes((nds) =>
              nds.map((n) =>
                n.id === id
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        video: previewUrl,
                        uploadedVideo: "",
                        uploading: true,
                        error: false,
                        errorMessage: "",
                      },
                    }
                  : n,
              ),
            );

            try {
              const url = await uploadVideo(file);
              if (!url) throw new Error("Upload failed");

              setNodes((nds) =>
                nds.map((n) =>
                  n.id === id
                    ? {
                        ...n,
                        data: {
                          ...n.data,
                          video: url,
                          uploadedVideo: url,
                          output: url,
                          uploading: false,
                          error: false,
                        },
                      }
                    : n,
                ),
              );
            } catch (err: any) {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === id
                    ? {
                        ...n,
                        data: {
                          ...n.data,
                          uploading: false,
                          error: true,
                          errorMessage: err?.message || "Upload failed",
                        },
                      }
                    : n,
                ),
              );
            }
          },
        }),

        ...(type === "image" && {
          running: false,
          uploading: false,
          image: "",
          uploadedImage: "",
          error: false,

          onUpload: async (file: File) => {
            const previewUrl = URL.createObjectURL(file);

            setNodes((nds) =>
              nds.map((n) =>
                n.id === id
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        image: previewUrl,
                        uploadedImage: "",
                        uploading: true,
                        error: false,
                      },
                    }
                  : n,
              ),
            );

            try {
              const url = await uploadImage(file);
              if (!url) throw new Error("Upload failed");

              setNodes((nds) =>
                nds.map((n) =>
                  n.id === id
                    ? {
                        ...n,
                        data: {
                          ...n.data,
                          image: url,
                          uploadedImage: url,
                          output: url,
                          uploading: false,
                        },
                      }
                    : n,
                ),
              );
            } catch {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === id
                    ? {
                        ...n,
                        data: {
                          ...n.data,
                          uploading: false,
                          error: true,
                        },
                      }
                    : n,
                ),
              );
            }
          },
        }),

        ...(type === "llm" && {
          model: "gemini-2.5-flash",
          output: "",
          error: false,
        }),

        ...(type === "crop" && {
          x: "0",
          y: "0",
          width: "100",
          height: "100",
          image: "",
          output: "",
          error: false,
        }),

        ...(type === "frame" && {
          time: "0",
          format: "jpg",
          image: "",
          output: "",
          error: false,
        }),

        onChange: (value: string) => {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, prompt: value } } : n,
            ),
          );
        },

        onModelChange: (value: string) => {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, model: value } } : n,
            ),
          );
        },

        onParamChange: (key: string, value: string) => {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n,
            ),
          );
        },
      },
    };

    rememberGraphState();
    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(newNode);
    addActivityHistory({
      type: "ADD_NODE",
      nodeType: type,
    });
  };

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source === params.target) return;

      const sourceNode = nodes.find((n) => n.id === params.source) as any;
      const targetNode = nodes.find((n) => n.id === params.target) as any;
      const sourceType = sourceNode?.type || "";
      const targetType = targetNode?.type || "";
      const sourceLooksVisual = visualNodeTypes.has(sourceType);
      const nextParams: Connection = { ...params };

      const sourceLabel = sourceNode?.data?.label ?? params.source;
      const targetLabel = targetNode?.data?.label ?? params.target;

      if (targetType === "llmNode") {
        if (!params.targetHandle && sourceLooksVisual) {
          nextParams.targetHandle = "images";
        } else if (!params.targetHandle) {
          nextParams.targetHandle = "user_message";
        }
      }

      if (targetType === "cropNode" && !params.targetHandle) {
        nextParams.targetHandle = "image_url";
      }

      if (targetType === "extractFrame" && !params.targetHandle) {
        nextParams.targetHandle =
          sourceType === "textNode" ? "timestamp" : "video_url";
      }

      if (wouldCreateCycle(nextParams.source!, nextParams.target!)) {
        showUiError("This connection would create a cycle.");
        return;
      }

      const connectionError = getConnectionError(
        sourceNode,
        targetNode,
        nextParams.targetHandle,
      );

      if (connectionError) {
        showUiError(connectionError);
        return;
      }

      setEdges((eds) => {
        const exists = eds.some(
          (e) =>
            e.source === nextParams.source &&
            e.target === nextParams.target &&
            e.targetHandle === nextParams.targetHandle,
        );

        if (exists) return eds;

        rememberGraphState();

        return addEdge(
          {
            ...nextParams,
            type: "pulse",
            id: `edge-${nextParams.source}-${nextParams.sourceHandle || "out"}-${nextParams.target}-${nextParams.targetHandle || "in"}-${Date.now()}`,
          },
          eds,
        );
      });

      addActivityHistory({
        type: "CONNECT",
        sourceType: sourceLabel,
        targetType: targetLabel,
      });
    },
    [nodes, setEdges, rememberGraphState],
  );

  const onNodeContextMenu = (event: React.MouseEvent, node: Node) => {
    event.preventDefault();

    setMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
    });
  };

  const deleteNodeById = (nodeId: string) => {
    const deleted = nodesRef.current.find((n) => n.id === nodeId) as any;
    if (!deleted) return;

    rememberGraphState();
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
    );

    addActivityHistory({
      type: "DELETE_NODE",
      nodeType: deleted.data.label,
    });

    setSelectedNode((current) => (current?.id === nodeId ? null : current));
    setMenu(null);
  };

  const deleteNode = () => {
    if (!menu) return;
    deleteNodeById(menu.nodeId);
  };

  const deleteSelectedNodes = () => {
    const selectedIds = nodes
      .filter((node) => node.selected)
      .map((node) => node.id);

    if (!selectedIds.length) return;

    rememberGraphState();
    setNodes((nds) => nds.filter((node) => !selectedIds.includes(node.id)));
    setEdges((eds) =>
      eds.filter(
        (edge) =>
          !selectedIds.includes(edge.source) &&
          !selectedIds.includes(edge.target),
      ),
    );
  };

  const getIncomingData = (
    nodeId: string,
    graphNodes: FlowNode[] = nodes,
    graphEdges: Edge[] = edges,
  ) => {
    return graphEdges
      .filter((edge) => edge.target === nodeId)
      .map((edge) => {
        const node = graphNodes.find((n) => n.id === edge.source);

        return node ? getFreshNode(node) : node;
      })
      .filter(Boolean)
      .map((node) => node?.data) as any[];
  };

  const isImageValue = (value = "") =>
    value.startsWith("data:image/") ||
    /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(value) ||
    (/^https?:\/\//i.test(value) &&
      /(image|generated-image|workflow-image|pollinations)/i.test(value));

  const isVideoValue = (value = "") =>
    value.startsWith("data:video/") ||
    /\.(mp4|mov|webm|mpeg|mpg|avi|wmv|3gp)(\?|$)/i.test(value) ||
    (/^https?:\/\//i.test(value) &&
      /(video|generated-video|workflow-video)/i.test(value));

  const getFreshNode = (node: FlowNode): FlowNode => {
    const freshOutput = runOutputsRef.current[node.id];

    if (freshOutput === undefined) return node;

    return {
      ...node,
      data: {
        ...node.data,
        output: freshOutput,
        ...(isImageValue(freshOutput) && {
          image: freshOutput,
          uploadedImage: freshOutput,
        }),
        ...(isVideoValue(freshOutput) && {
          video: freshOutput,
          uploadedVideo: freshOutput,
        }),
      },
    };
  };

  const getIncomingNodes = (
    nodeId: string,
    graphNodes: FlowNode[] = nodes,
    graphEdges: Edge[] = edges,
  ) => {
    return graphEdges
      .filter((edge) => edge.target === nodeId)
      .map((edge) => {
        const node = graphNodes.find((n) => n.id === edge.source);

        return node ? getFreshNode(node) : node;
      })
      .filter(Boolean) as FlowNode[];
  };

  const getNodeOutputValue = (node?: FlowNode | null) => {
    const data = node?.data || {};

    return (
      data.output ||
      data.uploadedImage ||
      data.image ||
      data.uploadedVideo ||
      data.video ||
      data.prompt ||
      ""
    );
  };

  const getIncomingValueByHandle = (
    nodeId: string,
    targetHandle: string,
    graphNodes: FlowNode[] = nodes,
    graphEdges: Edge[] = edges,
  ) => {
    const edge = graphEdges.find(
      (item) =>
        item.target === nodeId && item.targetHandle === targetHandle,
    );
    if (!edge) return "";

    const sourceNode = getFreshNode(
      graphNodes.find((node) => node.id === edge.source) as FlowNode,
    );

    return getNodeOutputValue(sourceNode);
  };

  const getIncomingValuesByHandle = (
    nodeId: string,
    targetHandle: string,
    graphNodes: FlowNode[] = nodes,
    graphEdges: Edge[] = edges,
  ) =>
    graphEdges
      .filter(
        (edge) =>
          edge.target === nodeId && edge.targetHandle === targetHandle,
      )
      .map((edge) =>
        getNodeOutputValue(
          getFreshNode(
            graphNodes.find((node) => node.id === edge.source) as FlowNode,
          ),
        ),
      )
      .filter(Boolean);

  const blobUrlToDataUrl = async (blobUrl: string) => {
    const blob = await fetch(blobUrl).then((res) => {
      if (!res.ok) {
        throw new Error("Failed to read local image preview");
      }

      return res.blob();
    });

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read image data"));
      reader.readAsDataURL(blob);
    });
  };

  const getBackendErrorMessage = (status: number, errorText: string) => {
    try {
      return JSON.parse(errorText)?.error || `Backend failed: ${status}`;
    } catch {
      const plainText = errorText
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (status === 413) {
        return "Payload too large. Upload the media first, then run the workflow again.";
      }

      return plainText || `Backend failed: ${status}`;
    }
  };

  const uploadBlobImageForNode = async (imageNode: FlowNode) => {
    const uploadedImage = imageNode.data?.uploadedImage;
    const image = imageNode.data?.image;

    if (uploadedImage) return uploadedImage;
    if (!image?.startsWith?.("blob:")) return image || "";

    setNodes((nds) =>
      nds.map((n) =>
        n.id === imageNode.id
          ? { ...n, data: { ...n.data, uploading: true, error: false } }
          : n,
      ),
    );

    const dataUrl = await blobUrlToDataUrl(image);
    const mimeType = dataUrl.match(/^data:(.+);base64,/)?.[1] || "image/jpeg";
    const uploadRes = await fetch(
      `${getBackendUrl()}/api/image/upload-base64`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dataUrl,
          fileName: `workflow-image-${Date.now()}.${mimeType.split("/")[1] || "jpg"}`,
        }),
      },
    );

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      let message = "Image upload failed";

      try {
        message = JSON.parse(errorText)?.error || message;
      } catch {
        message = errorText || message;
      }

      throw new Error(message);
    }

    const { url } = await uploadRes.json();

    if (!url) {
      throw new Error("Image upload did not return a URL");
    }

    setNodes((nds) =>
      nds.map((n) =>
        n.id === imageNode.id
          ? {
              ...n,
              data: {
                ...n.data,
                image: url,
                uploadedImage: url,
                output: url,
                uploading: false,
                error: false,
              },
            }
          : n,
      ),
    );

    return url;
  };

  const stopWorkflow = () => {
    stopWorkflowRef.current = true;
    abortControllerRef.current?.abort();
    setIsWorkflowRunning(false);
    setNodes((nds) =>
      nds.map((n) => ({ ...n, data: { ...n.data, running: false } })),
    );
  };

  const isQuotaError = (message: string) =>
    /quota|rate limit|resource_exhausted|exceeded|too many requests|credits/i.test(
      message,
    );

  const getQuotaDialogMessage = (message: string) => {
    if (/gemini|google/i.test(message)) {
      return "Gemini quota has been exceeded. Please add credits or wait for the quota window to reset, then run the workflow again.";
    }

    if (/openrouter|credits/i.test(message)) {
      return "Generation credits are exhausted. Please add credits or switch models, then run the workflow again.";
    }

    return "The model provider quota has been exceeded. Please wait for the quota to reset or add credits before running this workflow again.";
  };

  const showUiError = (message: string) => {
    lastUiErrorRef.current = message;
    setUiError(message);
    if (isQuotaError(message)) {
      setQuotaDialog(getQuotaDialogMessage(message));
    }
    window.setTimeout(() => {
      setUiError((current) => (current === message ? "" : current));
    }, 6000);
  };

  const setNodeOutput = (
    nodeId: string,
    output: string,
    error = output.startsWith("Error:"),
  ) => {
    runOutputsRef.current[nodeId] = output;
    if (error) {
      showUiError(output.replace(/^Error:\s*/, ""));
    }
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, output, error } } : n,
      ),
    );
  };

  useEffect(() => {
    const erroredNode = (nodes as unknown as FlowNode[]).find(
      (node) => node.data?.error,
    );
    const message =
      erroredNode?.data?.output?.replace(/^Error:\s*/, "") ||
      erroredNode?.data?.errorMessage ||
      "";

    if (message && message !== lastUiErrorRef.current) {
      showUiError(message);
    }
  }, [nodes]);

  const runGraphParallel = async (
    graphNodes: FlowNode[],
    graphEdges: Edge[],
  ) => {
    const completed = new Set<string>();
    const failed = new Set<string>();
    const pending = new Set(graphNodes.map((node) => node.id));

    while (pending.size > 0) {
      if (
        stopWorkflowRef.current ||
        abortControllerRef.current?.signal.aborted
      ) {
        break;
      }

      const ready = graphNodes.filter(
        (node) =>
          pending.has(node.id) &&
          graphEdges
            .filter((edge) => edge.target === node.id)
            .every(
              (edge) =>
                completed.has(edge.source) || failed.has(edge.source),
            ),
      );

      if (ready.length === 0) {
        showUiError("Workflow cannot run because the graph has a cycle.");
        break;
      }

      await Promise.all(
        ready.map(async (node) => {
          const upstreamFailed = graphEdges
            .filter((edge) => edge.target === node.id)
            .some((edge) => failed.has(edge.source));

          if (upstreamFailed) {
            failed.add(node.id);
            pending.delete(node.id);
            return;
          }

          await runNode(node, "", graphNodes, graphEdges, false);
          const output = runOutputsRef.current[node.id] || "";

          if (output.startsWith("Error:")) {
            failed.add(node.id);
          } else {
            completed.add(node.id);
          }

          pending.delete(node.id);
        }),
      );
    }
  };

  const runWorkflow = async () => {
    if (isWorkflowRunning) {
      stopWorkflow();
      return;
    }

    const uploadingNode = nodes.find(
      (n: any) =>
        n.data?.uploading &&
        !(n.type === "imageNode" && n.data?.image?.startsWith?.("blob:")),
    );
    if (uploadingNode) {
      const message =
        "Please wait for upload to finish before running the workflow.";
      setNodeOutput(uploadingNode.id, `Error: ${message}`, true);
      return;
    }

    stopWorkflowRef.current = false;
    abortControllerRef.current = new AbortController();
    runOutputsRef.current = {};
    executedRunNodesRef.current = new Set();
    setIsWorkflowRunning(true);
    const graph = {
      nodes: nodes.filter((node) => node.type !== "outputNode"),
      edges: edges.filter(
        (edge) =>
          !edge.source.startsWith("output-") &&
          !edge.target.startsWith("output-"),
      ),
    };
    setNodes(graph.nodes);
    setEdges(graph.edges);

    try {
      const selectedGraphNodes = graph.nodes.filter((node) => node.selected);

      if (selectedGraphNodes.length > 1) {
        const selectedIds = new Set(selectedGraphNodes.map((node) => node.id));
        const selectedEdges = graph.edges.filter(
          (edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target),
        );

        beginWorkflowRun("partial", `${selectedGraphNodes.length} nodes selected`);
        await runGraphParallel(selectedGraphNodes, selectedEdges);
        return;
      }

      if (selectedNode) {
        const selectedGraphNode =
          graph.nodes.find((node) => node.id === selectedNode.id) ||
          selectedNode;
        const outgoing = graph.edges.filter(
          (edge) => edge.source === selectedGraphNode.id,
        );
        beginWorkflowRun(
          outgoing.length > 0 ? "partial" : "single",
          outgoing.length > 0
            ? `${outgoing.length + 1} nodes selected`
            : "Single Node",
        );
        await runNode(selectedGraphNode, "", graph.nodes, graph.edges);
        return;
      }

      beginWorkflowRun("full", "Full Workflow");
      await runGraphParallel(graph.nodes, graph.edges);
    } finally {
      finishWorkflowRun();
      abortControllerRef.current = null;
      stopWorkflowRef.current = false;
      setIsWorkflowRunning(false);
      setNodes((nds) =>
        nds.map((n) => ({ ...n, data: { ...n.data, running: false } })),
      );
    }
  };

  const runNode = async (
    node: FlowNode,
    incomingOutput: string,
    graphNodes: FlowNode[] = nodes,
    graphEdges: Edge[] = edges,
    runDownstream = true,
  ) => {
    node = getFreshNode(node);

    if (stopWorkflowRef.current || abortControllerRef.current?.signal.aborted) {
      return;
    }

    if (executedRunNodesRef.current.has(node.id)) {
      return;
    }

    executedRunNodesRef.current.add(node.id);

    setNodes((nds) =>
      nds.map((n) =>
        n.id === node.id ? { ...n, data: { ...n.data, running: true } } : n,
      ),
    );

    const inputs: any = getIncomingData(node.id, graphNodes, graphEdges);
    const incomingNodes = getIncomingNodes(node.id, graphNodes, graphEdges);
    let nodeOutput = incomingOutput;
    const nodeRunStartedAt = Date.now();
    const nodeRunInputs = captureNodeInputs(node, incomingOutput);
    const completeNodeRun = (
      status: RunStatus,
      output = nodeOutput,
      error?: string,
    ) => {
      recordNodeRun({
        nodeId: node.id,
        nodeLabel: getNodeDisplayName(node),
        nodeType: node.type || "node",
        status,
        inputs: nodeRunInputs,
        output: summarizeHistoryValue(output),
        durationMs: Date.now() - nodeRunStartedAt,
        ...(error && { error }),
      });
    };

    recordNodeRun({
      nodeId: node.id,
      nodeLabel: getNodeDisplayName(node),
      nodeType: node.type || "node",
      status: "running",
      inputs: nodeRunInputs,
      output: "",
      durationMs: 0,
    });

    if (node.type === "textNode") {
      nodeOutput = node.data.prompt || incomingOutput || "";
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...n.data, output: nodeOutput, error: false } }
            : n,
        ),
      );
    }

    if (node.type === "imageNode") {
      try {
        nodeOutput =
          (await uploadBlobImageForNode(node)) || incomingOutput || "";
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    image: nodeOutput,
                    uploadedImage: nodeOutput,
                    output: nodeOutput,
                    error: false,
                  },
                }
              : n,
          ),
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Image upload failed";
        nodeOutput = `Error: ${message}`;
        showUiError(message);
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? { ...n, data: { ...n.data, uploading: false, error: true } }
              : n,
          ),
        );
        completeNodeRun("failed", nodeOutput, message);
        return;
      }
    }

    if (node.type === "videoNode") {
      const savedVideo =
        node.data.uploadedVideo ||
        (node.data.video?.startsWith?.("blob:") ? "" : node.data.video) ||
        "";

      if (node.data.video?.startsWith?.("blob:") && !node.data.uploadedVideo) {
        nodeOutput =
          "Error: Video is not uploaded yet. Re-upload the video and wait until upload finishes.";
        setNodeOutput(node.id, nodeOutput, true);
        completeNodeRun(
          "failed",
          nodeOutput,
          nodeOutput.replace(/^Error:\s*/, ""),
        );
        return;
      }

      nodeOutput = savedVideo || incomingOutput || "";
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...n.data, output: nodeOutput, error: false } }
            : n,
        ),
      );
    }

    if (node.type === "cropNode") {
      const imageUrl =
        getIncomingValueByHandle(
          node.id,
          "image_url",
          graphNodes,
          graphEdges,
        ) ||
        (incomingOutput?.startsWith("blob:") ? "" : incomingOutput) ||
        inputs.find((i: any) => i?.uploadedImage)?.uploadedImage ||
        inputs.find((i: any) => i?.image && !i.image.startsWith("blob:"))
          ?.image ||
        "";
      const getCropParam = (handle: string, fallback: string | number) =>
        getIncomingValueByHandle(node.id, handle, graphNodes, graphEdges) ||
        fallback;

      if (!imageUrl) {
        nodeOutput = "Error: Crop node requires an uploaded image URL.";
        setNodeOutput(node.id, nodeOutput, true);
        completeNodeRun(
          "failed",
          nodeOutput,
          nodeOutput.replace(/^Error:\s*/, ""),
        );
        return;
      }

      try {
        const res = await fetch(`${getBackendUrl()}/api/crop-image`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: abortControllerRef.current?.signal,
          body: JSON.stringify({
            imageUrl,
            xPercent: getCropParam("x_percent", node.data.x || 0),
            yPercent: getCropParam("y_percent", node.data.y || 0),
            widthPercent: getCropParam("width_percent", node.data.width || 100),
            heightPercent: getCropParam(
              "height_percent",
              node.data.height || 100,
            ),
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(getBackendErrorMessage(res.status, errorText));
        }

        const { imageUrl: outputImageUrl } = await res.json();

        if (!outputImageUrl) {
          throw new Error("Crop did not return an image URL");
        }

        nodeOutput = outputImageUrl;

        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    image: outputImageUrl,
                    output: outputImageUrl,
                    uploadedImage: outputImageUrl,
                    error: false,
                  },
                }
              : n,
          ),
        );
      } catch (err: any) {
        nodeOutput = `Error: ${err.message}`;
        setNodeOutput(node.id, nodeOutput, true);
        completeNodeRun("failed", nodeOutput, err.message);
        return;
      }
    }

    if (node.type === "extractFrame") {
      const videoUrl =
        getIncomingValueByHandle(
          node.id,
          "video_url",
          graphNodes,
          graphEdges,
        ) ||
        (incomingOutput?.startsWith("blob:") ? "" : incomingOutput) ||
        inputs.find((i: any) => i?.uploadedVideo)?.uploadedVideo ||
        inputs.find((i: any) => i?.video && !i.video.startsWith("blob:"))
          ?.video ||
        "";
      const timestamp =
        getIncomingValueByHandle(
          node.id,
          "timestamp",
          graphNodes,
          graphEdges,
        ) ||
        node.data.time ||
        0;

      if (!videoUrl) {
        nodeOutput =
          "Error: Extract Frame node requires an uploaded video URL.";
        setNodeOutput(node.id, nodeOutput, true);
        completeNodeRun(
          "failed",
          nodeOutput,
          nodeOutput.replace(/^Error:\s*/, ""),
        );
        return;
      }

      try {
        const res = await fetch(`${getBackendUrl()}/api/extract-frame`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: abortControllerRef.current?.signal,
          body: JSON.stringify({
            videoUrl,
            timestamp,
            format: node.data.format || "jpg",
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(getBackendErrorMessage(res.status, errorText));
        }

        const { imageUrl, model, provider } = await res.json();

        if (!imageUrl) {
          throw new Error("Frame extraction did not return an image URL");
        }

        nodeOutput = imageUrl;

        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    image: imageUrl,
                    output: imageUrl,
                    uploadedImage: imageUrl,
                    model: model || "",
                    provider: provider || "",
                    running: false,
                    error: false,
                  },
                }
              : n,
          ),
        );
      } catch (err: any) {
        nodeOutput = `Error: ${err.message}`;
        setNodeOutput(node.id, nodeOutput, true);
        completeNodeRun("failed", nodeOutput, err.message);
        return;
      }
    }

    if (node.type === "imageGenNode") {
      const promptText = node.data.prompt?.trim() || "";
      const inputSource =
        incomingOutput ||
        inputs.find((i: any) => i?.output)?.output ||
        inputs.find((i: any) => i?.uploadedImage)?.uploadedImage ||
        inputs.find((i: any) => i?.image)?.image ||
        inputs.find((i: any) => i?.prompt)?.prompt ||
        "";
      const uploadedImage = inputs.find(
        (i: any) => i?.uploadedImage,
      )?.uploadedImage;
      const nonBlobImage = inputs.find(
        (i: any) => i?.image && !i.image.startsWith("blob:"),
      )?.image;
      const hasImageInput = inputs.some(
        (i: any) => i?.uploadedImage || i?.image,
      );
      const uploadedVideo = inputs.find(
        (i: any) => i?.uploadedVideo,
      )?.uploadedVideo;
      const nonBlobVideo = inputs.find(
        (i: any) => i?.video && !i.video.startsWith("blob:"),
      )?.video;
      const hasVideoInput = inputs.some(
        (i: any) => i?.uploadedVideo || i?.video,
      );
      let imageDataUrl = "";
      let imageSource =
        (incomingOutput && isImageValue(incomingOutput)
          ? incomingOutput
          : "") ||
        uploadedImage ||
        nonBlobImage ||
        (hasImageInput && incomingOutput && !incomingOutput.startsWith("blob:")
          ? incomingOutput
          : "");
      const videoSource =
        (incomingOutput && isVideoValue(incomingOutput)
          ? incomingOutput
          : "") ||
        uploadedVideo ||
        nonBlobVideo ||
        (hasVideoInput && incomingOutput && !incomingOutput.startsWith("blob:")
          ? incomingOutput
          : "");

      if (!imageSource) {
        const blobImageNode = incomingNodes.find(
          (incomingNode) =>
            incomingNode.type === "imageNode" &&
            incomingNode.data?.image?.startsWith?.("blob:"),
        );

        if (blobImageNode) {
          try {
            imageDataUrl = await blobUrlToDataUrl(blobImageNode.data.image);
            imageSource = await uploadBlobImageForNode(blobImageNode);
          } catch (err: any) {
            nodeOutput = `Error: ${err?.message || "Image upload failed"}`;
            setNodes((nds) =>
              nds.map((n) =>
                n.id === node.id
                  ? {
                      ...n,
                      data: { ...n.data, output: nodeOutput, error: true },
                    }
                  : n,
              ),
            );
            completeNodeRun(
              "failed",
              nodeOutput,
              nodeOutput.replace(/^Error:\s*/, ""),
            );
            return;
          }
        }
      }

      if (
        !imageDataUrl &&
        hasImageInput &&
        incomingOutput?.startsWith("blob:")
      ) {
        try {
          imageDataUrl = await blobUrlToDataUrl(incomingOutput);
        } catch {
          imageDataUrl = "";
        }
      }

      if (
        (incomingOutput?.startsWith("blob:") ||
          inputs.some((i: any) => i?.image?.startsWith("blob:")) ||
          inputs.some((i: any) => i?.video?.startsWith("blob:"))) &&
        !imageSource &&
        !imageDataUrl &&
        !videoSource
      ) {
        nodeOutput =
          "Error: Media is still uploading. Please run again after upload finishes.";

        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    output: nodeOutput,
                    running: false,
                    error: true,
                  },
                }
              : n,
          ),
        );

        completeNodeRun(
          "failed",
          nodeOutput,
          nodeOutput.replace(/^Error:\s*/, ""),
        );
        return;
      }

      const requestPrompt =
        promptText ||
        (!imageSource && !imageDataUrl && inputSource
          ? inputSource
          : "Create a high-quality image.");

      try {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    running: true,
                    output: "Generating image...",
                    error: false,
                  },
                }
              : n,
          ),
        );

        const res = await fetch(`${getBackendUrl()}/api/run-image`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: abortControllerRef.current?.signal,
          body: JSON.stringify({
            prompt: requestPrompt,
            imageUrl: imageSource || undefined,
            imageDataUrl: imageDataUrl || undefined,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          const message = getBackendErrorMessage(res.status, errorText);

          throw new Error(message);
        }

        const { imageUrl } = await res.json();

        if (!imageUrl) {
          throw new Error("Image generation did not return a URL");
        }

        nodeOutput = imageUrl;

        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    image: imageUrl,
                    output: imageUrl,
                    uploadedImage: imageUrl,
                    error: false,
                  },
                }
              : n,
          ),
        );
      } catch (err: any) {
        if (
          stopWorkflowRef.current ||
          abortControllerRef.current?.signal.aborted ||
          err?.name === "AbortError"
        ) {
          completeNodeRun("stopped", "Stopped");
          return;
        }

        nodeOutput = `Error: ${err.message}`;
        setNodeOutput(node.id, nodeOutput, true);
        completeNodeRun("failed", nodeOutput, err.message);
      }
    }

    if (node.type === "videoGenNode") {
      const promptText = node.data.prompt?.trim() || "";
      const isImageValue = (value = "") =>
        value.startsWith("data:image/") ||
        /\.(png|jpe?g|webp|gif)(\?|$)/i.test(value);
      const isVideoValue = (value = "") =>
        value.startsWith("data:video/") ||
        /\.(mp4|mov|webm|mpeg|mpg|avi|wmv|3gp)(\?|$)/i.test(value);
      const textInputs = inputs
        .flatMap((i: any) => [i?.output, i?.prompt])
        .filter((value: any): value is string => Boolean(value))
        .filter(
          (value: string) => !isImageValue(value) && !isVideoValue(value),
        );
      const inputSource =
        (incomingOutput &&
        !isImageValue(incomingOutput) &&
        !isVideoValue(incomingOutput)
          ? incomingOutput
          : "") ||
        textInputs.join("\n") ||
        "";
      const imageUrl =
        (incomingOutput && isImageValue(incomingOutput)
          ? incomingOutput
          : "") ||
        inputs.find((i: any) => i?.uploadedImage)?.uploadedImage ||
        inputs.find((i: any) => i?.image && isImageValue(i.image))?.image ||
        inputs.find((i: any) => i?.output && isImageValue(i.output))?.output ||
        "";
      const requestPrompt =
        promptText && inputSource
          ? `${promptText}\n${inputSource}`
          : promptText || inputSource || "Animate this image.";

      try {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    running: true,
                    output: "Generating video...",
                    error: false,
                  },
                }
              : n,
          ),
        );

        const res = await fetch(`${getBackendUrl()}/api/run-video`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: abortControllerRef.current?.signal,
          body: JSON.stringify({
            prompt: requestPrompt,
            imageUrl: imageUrl || undefined,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          const message = getBackendErrorMessage(res.status, errorText);

          throw new Error(message);
        }

        const { videoUrl, model, provider } = await res.json();

        if (!videoUrl) {
          throw new Error("Video generation did not return a URL");
        }

        nodeOutput = videoUrl;

        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    video: videoUrl,
                    output: videoUrl,
                    uploadedVideo: videoUrl,
                    model: model || "",
                    provider: provider || "openrouter",
                    running: false,
                    error: false,
                  },
                }
              : n,
          ),
        );
      } catch (err: any) {
        if (
          stopWorkflowRef.current ||
          abortControllerRef.current?.signal.aborted ||
          err?.name === "AbortError"
        ) {
          completeNodeRun("stopped", "Stopped");
          return;
        }

        nodeOutput = `Error: ${err.message}`;
        setNodeOutput(node.id, nodeOutput, true);
        completeNodeRun("failed", nodeOutput, err.message);
      }
    }

    if (node.type === "llmNode") {
      const isMediaInput = (value = "") =>
        value.startsWith("blob:") ||
        value.startsWith("data:image/") ||
        value.startsWith("data:video/") ||
        /\.(png|jpe?g|webp|gif|mp4|mov|webm|mpeg|mpg|avi|wmv|3gp)(\?|$)/i.test(
          value,
        );
      const textInputs = inputs
        .flatMap((i: any) => [i?.output, i?.prompt])
        .filter((value: any): value is string => Boolean(value))
        .filter((value: string) => !isMediaInput(value));
      const systemPrompt = getIncomingValuesByHandle(
        node.id,
        "system_prompt",
        graphNodes,
        graphEdges,
      )
        .filter((value) => !isMediaInput(value))
        .join("\n");
      const userMessage = getIncomingValuesByHandle(
        node.id,
        "user_message",
        graphNodes,
        graphEdges,
      )
        .filter((value) => !isMediaInput(value))
        .join("\n");
      const imageInputs = getIncomingValuesByHandle(
        node.id,
        "images",
        graphNodes,
        graphEdges,
      );
      const inputSource =
        [systemPrompt, userMessage].filter(Boolean).join("\n\n") ||
        (incomingOutput && !isMediaInput(incomingOutput)
          ? incomingOutput
          : "") ||
        textInputs.join("\n") ||
        "";

      const uploadedImage = inputs.find(
        (i: any) => i?.uploadedImage,
      )?.uploadedImage;
      const nonBlobImage = inputs.find(
        (i: any) => i?.image && !i.image.startsWith("blob:"),
      )?.image;
      const hasImageInput = inputs.some(
        (i: any) => i?.uploadedImage || i?.image,
      );
      const uploadedVideo = inputs.find(
        (i: any) => i?.uploadedVideo,
      )?.uploadedVideo;
      const nonBlobVideo = inputs.find(
        (i: any) => i?.video && !i.video.startsWith("blob:"),
      )?.video;
      const hasVideoInput = inputs.some(
        (i: any) => i?.uploadedVideo || i?.video,
      );
      let imageDataUrl = "";
      let imageSource =
        imageInputs.find((value) => isImageValue(value)) ||
        (incomingOutput && isImageValue(incomingOutput)
          ? incomingOutput
          : "") ||
        uploadedImage ||
        nonBlobImage ||
        (hasImageInput && incomingOutput && !incomingOutput.startsWith("blob:")
          ? incomingOutput
          : "");
      const videoSource =
        imageInputs.find((value) => isVideoValue(value)) ||
        (incomingOutput && isVideoValue(incomingOutput)
          ? incomingOutput
          : "") ||
        uploadedVideo ||
        nonBlobVideo ||
        (hasVideoInput && incomingOutput && !incomingOutput.startsWith("blob:")
          ? incomingOutput
          : "");

      if (!imageSource) {
        const blobImageNode = incomingNodes.find(
          (incomingNode) =>
            incomingNode.type === "imageNode" &&
            incomingNode.data?.image?.startsWith?.("blob:"),
        );

        if (blobImageNode) {
          try {
            imageDataUrl = await blobUrlToDataUrl(blobImageNode.data.image);
            imageSource = await uploadBlobImageForNode(blobImageNode);
          } catch (err: any) {
            nodeOutput = `Error: ${err?.message || "Image upload failed"}`;
            setNodes((nds) =>
              nds.map((n) =>
                n.id === node.id
                  ? { ...n, data: { ...n.data, output: nodeOutput } }
                  : n,
              ),
            );
            completeNodeRun(
              "failed",
              nodeOutput,
              nodeOutput.replace(/^Error:\s*/, ""),
            );
            return;
          }
        }
      }

      if (
        !imageDataUrl &&
        hasImageInput &&
        incomingOutput?.startsWith("blob:")
      ) {
        try {
          imageDataUrl = await blobUrlToDataUrl(incomingOutput);
        } catch {
          imageDataUrl = "";
        }
      }

      if (
        (incomingOutput?.startsWith("blob:") ||
          inputs.some((i: any) => i?.image?.startsWith("blob:")) ||
          inputs.some((i: any) => i?.video?.startsWith("blob:"))) &&
        !imageSource &&
        !imageDataUrl &&
        !videoSource
      ) {
        nodeOutput =
          "Error: Media is still uploading. Please run again after upload finishes.";

        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? { ...n, data: { ...n.data, output: nodeOutput } }
              : n,
          ),
        );

        completeNodeRun(
          "failed",
          nodeOutput,
          nodeOutput.replace(/^Error:\s*/, ""),
        );
        return;
      }

      const requestPrompt =
        [
          systemPrompt ? `System instruction:\n${systemPrompt}` : "",
          userMessage ? `User message:\n${userMessage}` : "",
          inputSource || "Analyze the connected input.",
          "Use any attached visual input as the source of truth. Do not describe unrelated scenes or prior outputs.",
          "Do not ask follow-up questions. If details are missing, infer reasonable choices from the provided input.",
          imageSource || imageDataUrl || videoSource
            ? "Use the attached visual context for the response."
            : "",
        ]
          .filter(Boolean)
          .join("\n\n") || "Analyze the content.";

      try {
        if (imageSource || imageDataUrl || videoSource) {
          setNodeOutput(node.id, "Analyzing...", false);
        }

        const res = await fetch(`${getBackendUrl()}/api/run-llm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: abortControllerRef.current?.signal,
          body: JSON.stringify({
            prompt:
              requestPrompt ||
              "Analyze the connected input.",
            model: node.data.model || "gemini-2.5-flash",
            imageUrl: imageSource || undefined,
            imageDataUrl: imageDataUrl || undefined,
            videoUrl: videoSource || undefined,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          const message = getBackendErrorMessage(res.status, errorText);

          throw new Error(message);
        }

        const { output } = await res.json();

        const resultText = output || requestPrompt;

        nodeOutput = resultText;

        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? { ...n, data: { ...n.data, output: nodeOutput, error: false } }
              : n,
          ),
        );
      } catch (err: any) {
        if (
          stopWorkflowRef.current ||
          abortControllerRef.current?.signal.aborted ||
          err?.name === "AbortError"
        ) {
          completeNodeRun("stopped", "Stopped");
          return;
        }

        nodeOutput = `Error: ${err.message}`;
        setNodeOutput(node.id, nodeOutput, true);
        completeNodeRun("failed", nodeOutput, err.message);
      }
    }

    if (stopWorkflowRef.current || abortControllerRef.current?.signal.aborted) {
      completeNodeRun("stopped", "Stopped");
      return;
    }

    runOutputsRef.current[node.id] = nodeOutput;
    completeNodeRun(
      nodeOutput.startsWith("Error:") ? "failed" : "success",
      nodeOutput,
      nodeOutput.startsWith("Error:")
        ? nodeOutput.replace(/^Error:\s*/, "")
        : undefined,
    );

    setNodes((nds) =>
      nds.map((n) =>
        n.id === node.id ? { ...n, data: { ...n.data, running: false } } : n,
      ),
    );

    if (!runDownstream) return;

    const outgoing = graphEdges.filter((e) => e.source === node.id);

    for (const edge of outgoing) {
      if (
        stopWorkflowRef.current ||
        abortControllerRef.current?.signal.aborted
      ) {
        break;
      }

      const nextNode = graphNodes.find((n) => n.id === edge.target);
      if (nextNode) {
        await runNode(
          getFreshNode(nextNode),
          nodeOutput,
          graphNodes,
          graphEdges,
        );
      }
    }
  };

  useEffect(() => {
    const selected = nodes.find((n) => n.selected);
    setSelectedNode(selected || null);
  }, [nodes]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const connectedInputs = getConnectedInputsForNode(node.id, edges);

        if (
          JSON.stringify(node.data?.connectedInputs || {}) ===
          JSON.stringify(connectedInputs)
        ) {
          return node;
        }

        return {
          ...node,
          data: {
            ...node.data,
            connectedInputs,
          },
        };
      }),
    );
  }, [edges, setNodes]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;

      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undoGraph();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redoGraph();
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        if (menu) {
          deleteNode();
        } else {
          deleteSelectedNodes();
        }
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => window.removeEventListener("keydown", handleKey);
  }, [deleteSelectedNodes, menu, nodes, redoGraph, undoGraph]);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  useEffect(() => {
    setLeftCollapsed(
      window.localStorage.getItem(UI_STORAGE_KEYS.leftCollapsed) === "true",
    );
    setRightCollapsed(
      window.localStorage.getItem(UI_STORAGE_KEYS.rightCollapsed) === "true",
    );
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      UI_STORAGE_KEYS.leftCollapsed,
      String(leftCollapsed),
    );
  }, [leftCollapsed]);

  useEffect(() => {
    window.localStorage.setItem(
      UI_STORAGE_KEYS.rightCollapsed,
      String(rightCollapsed),
    );
  }, [rightCollapsed]);

  const handleSearch = () => {
    const topResult = filteredNodes[0];
    if (topResult) {
      addNode(topResult.id as NodeType);
    }
  };

  const filteredNodes = nodesList.filter((n) =>
    n.label.toLowerCase().includes(search.toLowerCase()),
  );

  const attachHandlers = (nodeList: Node[]) => {
    return nodeList.map((node) => {
      if (
        node.type === "textNode" ||
        node.type === "imageGenNode" ||
        node.type === "videoGenNode" ||
        node.type === "llmNode" ||
        node.type === "cropNode" ||
        node.type === "extractFrame"
      ) {
        return {
          ...node,
          data: {
            ...node.data,
            ...(node.type === "llmNode" && {
              model: node.data.model || "gemini-2.5-flash",
            }),
            onDelete: () => deleteNodeById(node.id),
            onChange: (value: string) => {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === node.id
                    ? { ...n, data: { ...n.data, prompt: value } }
                    : n,
                ),
              );
            },
            onModelChange: (value: string) => {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === node.id
                    ? { ...n, data: { ...n.data, model: value } }
                    : n,
                ),
              );
            },
            onParamChange: (key: string, value: string) => {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === node.id
                    ? { ...n, data: { ...n.data, [key]: value } }
                    : n,
                ),
              );
            },
          },
        };
      }

      if (node.type === "videoNode") {
        const savedVideo =
          node.data.uploadedVideo ||
          (node.data.video?.startsWith?.("blob:") ? "" : node.data.video) ||
          "";

        return {
          ...node,
          data: {
            ...node.data,
            video: savedVideo,
            uploadedVideo: savedVideo,
            uploading: false,
            error: false,
            errorMessage: "",
            onDelete: () => deleteNodeById(node.id),
            onUpload: async (file: File) => {
              try {
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === node.id
                      ? {
                          ...n,
                          data: { ...n.data, uploading: true, error: false },
                        }
                      : n,
                  ),
                );
                const url = await uploadVideo(file);
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === node.id
                      ? {
                          ...n,
                          data: {
                            ...n.data,
                            video: url,
                            uploadedVideo: url,
                            output: url,
                            uploading: false,
                            error: false,
                            errorMessage: "",
                          },
                        }
                      : n,
                  ),
                );
              } catch (err: any) {
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === node.id
                      ? {
                          ...n,
                          data: {
                            ...n.data,
                            uploading: false,
                            error: true,
                            errorMessage: err?.message || "Upload failed",
                          },
                        }
                      : n,
                  ),
                );
              }
            },
          },
        };
      }

      if (node.type === "imageNode") {
        return {
          ...node,
          data: {
            ...node.data,
            onDelete: () => deleteNodeById(node.id),
            onUpload: async (file: File) => {
              const previewUrl = URL.createObjectURL(file);
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === node.id
                    ? {
                        ...n,
                        data: {
                          ...n.data,
                          image: previewUrl,
                          uploadedImage: "",
                          uploading: true,
                          error: false,
                        },
                      }
                    : n,
                ),
              );

              try {
                const url = await uploadImage(file);
                if (!url) throw new Error("Upload failed");
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === node.id
                      ? {
                          ...n,
                          data: {
                            ...n.data,
                            image: url,
                            uploadedImage: url,
                            output: url,
                            uploading: false,
                          },
                        }
                      : n,
                  ),
                );
              } catch {
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === node.id
                      ? {
                          ...n,
                          data: { ...n.data, uploading: false, error: true },
                        }
                      : n,
                  ),
                );
              }
            },
          },
        };
      }

      return node;
    });
  };

  const onDragStartNode = (
    event: React.DragEvent<HTMLButtonElement>,
    type: NodeType,
  ) => {
    event.dataTransfer.setData("application/nextflow-node", type);
    event.dataTransfer.effectAllowed = "move";
  };

  const onCanvasDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const onCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData(
      "application/nextflow-node",
    ) as NodeType;

    if (!nodeTypeMap[type]) return;

    const bounds = flowWrapperRef.current?.getBoundingClientRect();
    const viewport = viewportRef.current;
    const position = {
      x: ((event.clientX - (bounds?.left || 0)) - viewport.x) / viewport.zoom,
      y: ((event.clientY - (bounds?.top || 0)) - viewport.y) / viewport.zoom,
    };

    addNode(type, position);
  };

  const getPersistableNodes = () => {
    return nodes
      .filter((node) => node.type !== "outputNode")
      .map((node: any) => {
        if (node.type !== "videoNode") return node;

        const uploadedVideo = node.data.uploadedVideo || "";
        const video = node.data.video?.startsWith?.("blob:")
          ? uploadedVideo
          : node.data.video || uploadedVideo;

        return {
          ...node,
          data: {
            ...node.data,
            video,
            uploadedVideo,
            uploading: false,
          },
        };
      });
  };

  const normalizeWorkflowEdge = (
    edge: Edge,
    nodeList: FlowNode[] = nodes,
  ): Edge => {
    const sourceNode = getNodeById(nodeList, edge.source);
    const targetNode = getNodeById(nodeList, edge.target);
    const nextEdge: Edge = {
      ...edge,
      type: edge.type || "pulse",
    };

    if (!nextEdge.targetHandle) {
      if (targetNode?.type === "llmNode") {
        if (visualNodeTypes.has(sourceNode?.type || "")) {
          nextEdge.targetHandle = "images";
        } else {
          nextEdge.targetHandle = "user_message";
        }
      } else if (targetNode?.type === "cropNode") {
        nextEdge.targetHandle = "image_url";
      } else if (targetNode?.type === "extractFrame") {
        nextEdge.targetHandle =
          sourceNode?.type === "textNode" ? "timestamp" : "video_url";
      }
    }

    return {
      ...nextEdge,
      id:
        nextEdge.id ||
        `edge-${nextEdge.source}-${nextEdge.sourceHandle || "out"}-${nextEdge.target}-${nextEdge.targetHandle || "in"}`,
    };
  };

  const getPersistableEdges = () =>
    edges
      .filter(
        (edge) =>
          !edge.source.startsWith("output-") &&
          !edge.target.startsWith("output-"),
      )
      .map((edge) => normalizeWorkflowEdge(edge));

  const saveWorkflow = async () => {
    const workflowId = getWorkflowIdFromPath();

    await fetch(`${getBackendUrl()}/api/workflow/${workflowId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        nodes: getPersistableNodes(),
        edges: getPersistableEdges(),
        history,
      }),
    });
  };

  const exportWorkflowJson = () => {
    const workflowId = getWorkflowIdFromPath();
    const payload = {
      id: workflowId,
      name,
      exportedAt: new Date().toISOString(),
      nodes: getPersistableNodes(),
      edges: getPersistableEdges(),
      history,
    };
    const json = JSON.stringify(
      payload,
      (_key, value) => (typeof value === "function" ? undefined : value),
      2,
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = name.trim().replace(/[^a-z0-9-_]+/gi, "-") || "workflow";

    link.href = url;
    link.download = `${safeName}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importWorkflowJson = async (file: File) => {
    try {
      const payload = JSON.parse(await file.text());
      const importedNodes = Array.isArray(payload.nodes) ? payload.nodes : [];
      const importedEdges = Array.isArray(payload.edges) ? payload.edges : [];
      const importedNodeIds = new Set(
        importedNodes.map((node: FlowNode) => node.id),
      );

      rememberGraphState();
      setNodes(attachHandlers(importedNodes));
      setEdges(
        importedEdges
          .filter(
            (edge: Edge) =>
              importedNodeIds.has(edge.source) &&
              importedNodeIds.has(edge.target),
          )
          .map((edge: Edge) => normalizeWorkflowEdge(edge, importedNodes)),
      );
      setName(payload.name || "Imported Workflow");
      setHistory(payload.history || { runs: [] });
    } catch {
      showUiError("Could not import this workflow JSON.");
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    if (!isLoaded || !hasWorkflowAccess) return;
    saveWorkflow();
  }, [nodes, edges, name, history, isLoaded, hasWorkflowAccess, saveWorkflow]);

  const loadWorkflow = async (clerkId: string) => {
    const workflowId = getWorkflowIdFromPath();

    if (!workflowId) {
      setAccessError("This workflow link is invalid.");
      setHasWorkflowAccess(false);
      return;
    }

    const res = await fetch(`${getBackendUrl()}/api/workflow/${clerkId}`);

    if (!res.ok) {
      setAccessError("Could not verify access to this workflow.");
      setHasWorkflowAccess(false);
      return;
    }

    const workflows = await res.json();
    const data = Array.isArray(workflows)
      ? workflows.find(
          (workflow: { id?: string }) => workflow.id === workflowId,
        )
      : null;

    if (!data) {
      setAccessError("You do not have access to this workflow.");
      setHasWorkflowAccess(false);
      return;
    }

    const attachHandlers = (nodes: Node[]) => {
      return nodes.map((node) => {
        if (
          node.type === "textNode" ||
          node.type === "imageGenNode" ||
          node.type === "videoGenNode" ||
          node.type === "llmNode" ||
          node.type === "cropNode" ||
          node.type === "extractFrame"
        ) {
          return {
            ...node,
            data: {
              ...node.data,
              ...(node.type === "llmNode" && {
                model: node.data.model || "gemini-2.5-flash",
              }),
              onDelete: () => deleteNodeById(node.id),
              onChange: (value: string) => {
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === node.id
                      ? { ...n, data: { ...n.data, prompt: value } }
                      : n,
                  ),
                );
              },
              onModelChange: (value: string) => {
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === node.id
                      ? { ...n, data: { ...n.data, model: value } }
                      : n,
                  ),
                );
              },
              onParamChange: (key: string, value: string) => {
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === node.id
                      ? { ...n, data: { ...n.data, [key]: value } }
                      : n,
                  ),
                );
              },
            },
          };
        }

        if (node.type === "videoNode") {
          const savedVideo =
            node.data.uploadedVideo ||
            (node.data.video?.startsWith?.("blob:") ? "" : node.data.video) ||
            "";

          return {
            ...node,
            data: {
              ...node.data,
              video: savedVideo,
              uploadedVideo: savedVideo,
              uploading: false,
              error: false,
              errorMessage: "",
              onDelete: () => deleteNodeById(node.id),
              onUpload: async (file: File) => {
                try {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === node.id
                        ? {
                            ...n,
                            data: {
                              ...n.data,
                              uploading: true,
                              error: false,
                              errorMessage: "",
                            },
                          }
                        : n,
                    ),
                  );

                  const url = await uploadVideo(file);

                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === node.id
                        ? {
                            ...n,
                            data: {
                              ...n.data,
                              video: url,
                              uploadedVideo: url,
                              output: url,
                              uploading: false,
                              error: false,
                              errorMessage: "",
                            },
                          }
                        : n,
                    ),
                  );
                } catch (err: any) {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === node.id
                        ? {
                            ...n,
                            data: {
                              ...n.data,
                              uploading: false,
                              error: true,
                              errorMessage: err?.message || "Upload failed",
                            },
                          }
                        : n,
                    ),
                  );
                }
              },
            },
          };
        }

        if (node.type === "imageNode") {
          return {
            ...node,
            data: {
              ...node.data,
              onDelete: () => deleteNodeById(node.id),
              onUpload: async (file: File) => {
                const previewUrl = URL.createObjectURL(file);

                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === node.id
                      ? {
                          ...n,
                          data: {
                            ...n.data,
                            image: previewUrl,
                            uploadedImage: "",
                            uploading: true,
                            error: false,
                          },
                        }
                      : n,
                  ),
                );

                try {
                  const url = await uploadImage(file);
                  if (!url) throw new Error("Upload failed");

                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === node.id
                        ? {
                            ...n,
                            data: {
                              ...n.data,
                              image: url,
                              uploadedImage: url,
                              output: url,
                              uploading: false,
                            },
                          }
                        : n,
                    ),
                  );
                } catch {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === node.id
                        ? {
                            ...n,
                            data: { ...n.data, uploading: false, error: true },
                          }
                        : n,
                    ),
                  );
                }
              },
            },
          };
        }

        return node;
      });
    };

    const loadedNodes = (data.nodes || []).filter(
      (node: FlowNode) => node.type !== "outputNode",
    );
    const loadedNodeIds = new Set(loadedNodes.map((node: FlowNode) => node.id));
    setNodes(attachHandlers(loadedNodes));
    setEdges(
      (data.edges || [])
        .filter(
          (edge: Edge) =>
            loadedNodeIds.has(edge.source) && loadedNodeIds.has(edge.target),
        )
        .map((edge: Edge) => normalizeWorkflowEdge(edge, loadedNodes)),
    );
    setName(data.name || "Untitled Workflow");
    setHistory(data.history || {});
    setAccessError("");
    setHasWorkflowAccess(true);
    setIsLoaded(true);
  };

  useEffect(() => {
    if (!isUserLoaded) return;

    if (!isSignedIn || !user) {
      router.replace("/sign-in");
      return;
    }

    loadWorkflow(user.id);
  }, [isSignedIn, isUserLoaded, router, user]);

  if (!isUserLoaded || (!isLoaded && !accessError)) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-sm text-white/70">
        Loading workflow...
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="flex h-screen items-center justify-center bg-black px-6 text-center text-white">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-lg font-semibold">Workflow access blocked</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            {accessError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden flex bg-black text-white">
      {!open && !historyOpen && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[75] flex items-center justify-between px-3 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pointer-events-auto flex size-10 items-center justify-center rounded-lg border border-white/10 bg-black/75 text-white/80 shadow-lg backdrop-blur hover:bg-white/10 hover:text-white"
            aria-label="Open nodes menu"
            title="Open nodes menu"
          >
            <Menu className="size-5" />
          </button>

          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="pointer-events-auto flex size-10 items-center justify-center rounded-lg border border-white/10 bg-black/75 text-white/80 shadow-lg backdrop-blur hover:bg-white/10 hover:text-white"
            aria-label="Open history"
            title="Open history"
          >
            <Clock10 className="size-5" />
          </button>
        </div>
      )}
      <span className="hidden">☰</span>

      <div
        className={`
        fixed left-0 top-0 z-[70] h-dvh w-[min(86vw,20rem)] border-r border-white/10 bg-zinc-950/98 shadow-2xl shadow-black/60
        transform overflow-hidden transition-[width,transform] duration-300
        ${open ? "translate-x-0" : "-translate-x-full"}
        md:static md:z-40 md:h-screen md:translate-x-0 md:shadow-none
        ${leftCollapsed ? "md:w-[58px]" : "md:w-64"}
      `}
      >
        <div className="flex h-full flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 p-3">
            {(!leftCollapsed || open) && (
              <div>
                <p className="text-sm font-semibold">Nodes</p>
                <p className="text-xs text-white/40">Add building blocks</p>
              </div>
            )}

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setLeftCollapsed((value) => !value)}
                className="hidden rounded p-1.5 text-white/50 hover:bg-white/10 hover:text-white md:block"
                aria-label={
                  leftCollapsed ? "Expand nodes menu" : "Collapse nodes menu"
                }
                title={
                  leftCollapsed ? "Expand nodes menu" : "Collapse nodes menu"
                }
              >
                {leftCollapsed ? (
                  <PanelLeftOpen className="size-4" />
                ) : (
                  <PanelLeftClose className="size-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1.5 text-white/50 hover:bg-white/10 hover:text-white md:hidden"
                aria-label="Close nodes menu"
                title="Close nodes menu"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {leftCollapsed ? (
            <div className="min-h-0 flex-1">
              <div className="hidden h-full flex-col items-center gap-2 p-2 md:flex">
                {nodesList.slice(0, 6).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    draggable
                    onDragStart={(event) => onDragStartNode(event, n.id)}
                    onClick={() => addNode(n.id)}
                    className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-zinc-900 text-xs font-semibold text-white/65 hover:bg-zinc-800 hover:text-white"
                    aria-label={`Add ${n.label}`}
                    title={n.label}
                  >
                    {n.label.slice(0, 1)}
                  </button>
                ))}
              </div>

              <div className="flex h-full flex-col gap-3 p-4 md:hidden">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
                  <input
                    placeholder="Search nodes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                        setOpen(false);
                      }
                    }}
                    className="w-full rounded-lg border border-white/10 bg-zinc-900 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-white/25"
                  />
                </div>

                <div className="node-scroll min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="flex flex-col gap-2">
                    {filteredNodes.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        draggable
                        onDragStart={(event) => onDragStartNode(event, n.id)}
                        onClick={() => {
                          addNode(n.id);
                          setOpen(false);
                        }}
                        className="rounded-lg border border-white/5 bg-zinc-900 p-2.5 text-left text-sm text-white/75 transition hover:border-white/10 hover:bg-zinc-800 hover:text-white"
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
                <input
                  placeholder="Search nodes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                      setOpen(false);
                    }
                  }}
                  className="w-full rounded-lg border border-white/10 bg-zinc-900 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-white/25"
                />
              </div>

              <div className="node-scroll min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="flex flex-col gap-2">
                  {filteredNodes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      draggable
                      onDragStart={(event) => onDragStartNode(event, n.id)}
                      onClick={() => {
                        addNode(n.id);
                        setOpen(false);
                      }}
                      className="rounded-lg border border-white/5 bg-zinc-900 p-2.5 text-left text-sm text-white/75 transition hover:border-white/10 hover:bg-zinc-800 hover:text-white"
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      <div
        ref={flowWrapperRef}
        className="flex-1 min-w-0 relative"
        onDragOver={onCanvasDragOver}
        onDrop={onCanvasDrop}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          edgeTypes={edgeTypes}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeClick={(_, edge) => {
            rememberGraphState();
            setEdges((eds) => eds.filter((e) => e.id !== edge.id));
          }}
          onEdgesDelete={(deletedEdges) => {
            rememberGraphState();
            setEdges((eds) => eds.filter((e) => !deletedEdges.includes(e)));
          }}
          onConnect={onConnect}
          onMove={(_, viewport) => {
            viewportRef.current = viewport;
          }}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={() => {
            setMenu(null);
            setSelectedNode(null);
          }}
          onNodeDragStart={() => {
            setMenu(null);
            rememberGraphState();
          }}
          panActivationKeyCode={null}
          defaultViewport={INITIAL_WORKFLOW_VIEWPORT}
          fitView
          fitViewOptions={WORKFLOW_FIT_VIEW_OPTIONS}
          minZoom={0.25}
          maxZoom={1.6}
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
          <div className="absolute right-3 top-14 z-50 flex md:flex-row flex-col items-end gap-2 md:right-4 md:top-4">
            <button
              onClick={undoGraph}
              aria-label="Undo"
              title="Undo"
              className="rounded-md border border-white/10 bg-[#111] px-2 py-1.5 text-xs text-white/70 shadow hover:bg-[#1a1a1a] hover:text-white"
            >
              <Undo2Icon size={15} />
            </button>
            <button
              onClick={redoGraph}
              aria-label="Redo"
              title="Redo"
              className="rounded-md border border-white/10 bg-[#111] px-2 py-1.5 text-xs text-white/70 shadow hover:bg-[#1a1a1a] hover:text-white"
            >
             <Redo2Icon size={15} />

            </button>
            <button
              onClick={runWorkflow}
              className={`px-3 py-1.5 rounded-md text-xs text-white/80 shadow border border-white/10 ${
                isWorkflowRunning
                  ? "bg-red-950/80 hover:bg-red-900/80"
                  : "bg-[#111] hover:bg-[#1a1a1a]"
              }`}
            >
              {isWorkflowRunning ? "Stop Workflow" : "Run Workflow"}
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              aria-label="Import workflow JSON"
              title="Import workflow JSON"
              className="rounded-md border border-white/10 bg-[#111] px-2 py-1.5 text-xs text-white/70 shadow hover:bg-[#1a1a1a] hover:text-white"
            >
              Import
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  importWorkflowJson(file);
                }
              }}
            />
            <button
              onClick={exportWorkflowJson}
              aria-label="Export workflow JSON"
              title="Export workflow JSON"
              className="rounded-md border border-white/10 bg-[#111] p-2 text-white/70 shadow hover:bg-[#1a1a1a] hover:text-white"
            >
              <Download className="size-4" />
            </button>
          </div>
          <div className="absolute left-3 top-14 z-50 md:left-0 md:top-0">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-[min(220px,calc(100vw-6rem))] rounded-md border border-white/10 bg-black/60 px-4 py-2 text-sm text-white outline-none backdrop-blur-md md:ml-5 md:mt-8 md:w-[min(260px,calc(100vw-6rem))]"
            />
          </div>
          <Background gap={20} size={2} />
          <MiniMap
            nodeColor="#3b82f6"
            maskColor="rgba(0,0,0,0.2)"
            style={{
              backgroundColor: "#111",
              borderRadius: 16,
            }}
          />
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

      {uiError && (
        <div className="fixed bottom-5 right-5 z-[80] w-[min(360px,calc(100vw-2rem))] rounded-lg border border-red-400/50 bg-red-950/95 p-4 text-sm text-red-50 shadow-2xl shadow-red-950/40">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-red-200">
              Error
            </span>
            <button
              type="button"
              onClick={() => setUiError("")}
              className="rounded px-1.5 text-red-100/70 hover:bg-red-900 hover:text-red-50"
              aria-label="Dismiss error"
            >
              x
            </button>
          </div>
          <p className="leading-relaxed">{uiError}</p>
        </div>
      )}

      {quotaDialog && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={() => setQuotaDialog("")}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quota-dialog-title"
            className="w-full max-w-md rounded-xl border border-red-400/30 bg-[#0b0b0b] p-5 text-white shadow-2xl shadow-black/60"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-300">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h2
                    id="quota-dialog-title"
                    className="text-base font-semibold"
                  >
                    Quota exceeded
                  </h2>
                  <p className="text-xs text-white/45">Workflow stopped</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuotaDialog("")}
                className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
                aria-label="Close quota dialog"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-white/70">
              {quotaDialog}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setQuotaDialog("")}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`
      fixed right-0 top-0 z-[70] h-dvh w-[min(86vw,22rem)] shrink-0 border-l border-white/10 bg-zinc-950/98 shadow-2xl shadow-black/60
      transform overflow-hidden transition-[width,transform] duration-300
      ${historyOpen ? "translate-x-0" : "translate-x-full"}
      md:static md:h-screen md:translate-x-0 md:shadow-none
      ${rightCollapsed ? "md:w-[58px]" : "md:w-72"}
    `}
      >
        {rightCollapsed && !historyOpen ? (
          <div className="hidden h-full flex-col items-center gap-2 p-2 md:flex">
            <button
              type="button"
              onClick={() => setRightCollapsed(false)}
              className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-zinc-900 text-white/65 hover:bg-zinc-800 hover:text-white"
              aria-label="Expand history"
              title="Expand history"
            >
              <PanelRightOpen className="size-4" />
            </button>
            <div className="mt-1 flex size-10 items-center justify-center rounded-lg bg-white/5 text-white/45">
              <Clock10 className="size-4" />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 p-4">
              <div>
                <div className="text-sm font-semibold">History</div>
                <p className="text-xs text-white/40">
                  {runHistory.length} runs
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Clear history"
                  title="Clear history"
                  onClick={() => setHistory({})}
                  className="rounded p-1.5 text-white/45 hover:bg-white/10 hover:text-white"
                >
                  <Trash2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRightCollapsed(true)}
                  className="hidden rounded p-1.5 text-white/45 hover:bg-white/10 hover:text-white md:block"
                  aria-label="Collapse history"
                  title="Collapse history"
                >
                  <PanelRightClose className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  className="rounded p-1.5 text-white/45 hover:bg-white/10 hover:text-white md:hidden"
                  aria-label="Close history"
                  title="Close history"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="node-scroll flex-1 overflow-y-auto px-4 py-4">
              <div className="flex flex-col gap-3">
                {runHistory.length === 0 && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/45">
                    No workflow runs yet.
                  </div>
                )}
                {runHistory.map((run) => {
                  const isExpanded = expandedRunId === run.id;

                  return (
                    <div
                      key={run.id}
                      className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] text-xs text-white/70"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRunId(isExpanded ? null : run.id)
                        }
                        className="w-full p-3 text-left hover:bg-white/[0.03]"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-white/85">
                              Run #{run.number}
                            </div>
                            <div className="mt-0.5 text-white/40">
                              {formatRunDate(run.startedAt)}
                            </div>
                          </div>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase ${getStatusClasses(
                              run.status,
                            )}`}
                          >
                            {getStatusIcon(run.status)}
                            {run.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/45">
                          <span className="rounded border border-white/10 px-1.5 py-0.5 uppercase">
                            {run.scope}
                          </span>
                          <span>{run.scopeLabel}</span>
                          <span className="inline-flex items-center gap-1">
                            <Timer className="size-3" />
                            {formatDuration(run.durationMs)}
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-white/10 p-3">
                          {run.nodeRuns.length === 0 ? (
                            <div className="text-white/40">
                              Waiting for node execution details...
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3">
                              {run.nodeRuns.map((nodeRun) => (
                                <div
                                  key={nodeRun.nodeId}
                                  className="rounded-md border border-white/5 bg-black/20 p-2.5"
                                >
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="truncate font-medium text-white/85">
                                        {nodeRun.nodeLabel}
                                      </div>
                                      <div className="truncate text-[10px] text-white/35">
                                        {nodeRun.nodeId}
                                      </div>
                                    </div>
                                    <span
                                      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase ${getStatusClasses(
                                        nodeRun.status,
                                      )}`}
                                    >
                                      {getStatusIcon(nodeRun.status)}
                                      {formatDuration(nodeRun.durationMs)}
                                    </span>
                                  </div>

                                  {Object.keys(nodeRun.inputs).length > 0 && (
                                    <div className="mb-2">
                                      <div className="mb-1 text-[10px] uppercase text-white/35">
                                        Inputs
                                      </div>
                                      <div className="space-y-1">
                                        {Object.entries(nodeRun.inputs).map(
                                          ([key, value]) => (
                                            <div
                                              key={key}
                                              className="break-words rounded bg-white/[0.03] px-2 py-1 text-white/55"
                                            >
                                              <span className="text-white/35">
                                                {key}:{" "}
                                              </span>
                                              {value}
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <div>
                                    <div className="mb-1 text-[10px] uppercase text-white/35">
                                      Output
                                    </div>
                                    <div
                                      className={`break-words rounded px-2 py-1 ${
                                        nodeRun.status === "failed"
                                          ? "bg-red-400/10 text-red-100"
                                          : "bg-white/[0.03] text-white/60"
                                      }`}
                                    >
                                      {nodeRun.error ||
                                        nodeRun.output ||
                                        "No output captured"}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {historyOpen && (
        <div
          onClick={() => setHistoryOpen(false)}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}
    </div>
  );
}
