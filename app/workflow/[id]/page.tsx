"use client";

import { useState, useCallback, JSX, useEffect, useRef } from "react";
import { ConnectionLineType } from "reactflow";
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
  Clock10,
  Download,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Trash2,
  X,
} from "lucide-react";
import PulseEdge from "@/app/_components/PulseEdge";
import OutputNode from "@/app/_components/OutputNode";

type NodeType =
  | "text"
  | "image"
  | "video"
  | "imageGen"
  | "videoGen"
  | "llm"
  | "crop"
  | "frame"
  | "output";

const nodesList: { id: NodeType; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "image", label: "Upload Image" },
  { id: "imageGen", label: "AI Image" },
  { id: "video", label: "Upload Video" },
  { id: "llm", label: "LLM" },
  { id: "crop", label: "Crop Image" },
  { id: "frame", label: "Extract Frame" },
  { id: "videoGen", label: "AI Video" },
];

const UI_STORAGE_KEYS = {
  leftCollapsed: "nextflow.workflow.leftCollapsed",
  rightCollapsed: "nextflow.workflow.rightCollapsed",
};

const nodeTypes = {
  imageNode: ImageNode,
  textNode: TextNode,
  videoNode: VideoNode,
  cropNode: CropNode,
  llmNode: LLMNode,
  imageGenNode: ImageGenNode,
  videoGenNode: VideoGenNode,
  extractFrame: ExtractFrameNode,
  outputNode: OutputNode,
};

const getBackendUrl = () => {
  const configured = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();

  if (!configured) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
  }

  return configured.replace(/\/$/, "");
};

export default function WorkflowPage(): JSX.Element {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [history, setHistory] = useState<Record<string, any[]>>({});
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [uiError, setUiError] = useState("");
  const [quotaDialog, setQuotaDialog] = useState("");
  const stopWorkflowRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const runOutputsRef = useRef<Record<string, string>>({});
  const lastUiErrorRef = useRef("");
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [name, setName] = useState("Untitled Workflow");
  const edgeTypes = {
    pulse: PulseEdge,
  };

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
  const uploadVideo = async (file: File) => {
    const uploadResponse = await fetch(
      `${getBackendUrl()}/api/video/upload-direct`,
      {
      method: "POST",
        headers: {
          "Content-Type": file.type || "video/mp4",
          "X-File-Name": encodeURIComponent(file.name),
        },
        body: file,
      },
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(getBackendErrorMessage(uploadResponse.status, errorText));
    }

    const data = await uploadResponse.json();

    if (!data.url) {
      throw new Error("Video upload did not return a URL");
    }

    return data.url;
  };

  const uploadImage = async (file: File) => {
    const res = await fetch(
      `${getBackendUrl()}/api/image/upload-url`,
    );

    const data = await res.json();

    const uploadUrl = data.uploadUrl;
    const assemblyId = data.assemblyId;
    const params = data.params;

    if (!uploadUrl || !assemblyId) {
      throw new Error("Upload URL or Assembly ID missing");
    }

    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append(
      "params",
      typeof params === "string" ? params : JSON.stringify(params),
    );

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

    const supabaseRes = await fetch(
      `${getBackendUrl()}/upload-image`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileUrl: transloaditUrl }),
      },
    );

    const supabaseData = await supabaseRes.json();

    return supabaseData.url;
  };

  const nodeTypeMap: Record<NodeType, string> = {
    image: "imageNode",
    text: "textNode",
    video: "videoNode",
    imageGen: "imageGenNode",
    videoGen: "videoGenNode",
    llm: "llmNode",
    crop: "cropNode",
    frame: "extractFrame",
    output: "outputNode",
  };

  const createOutputNodeFor = (node: FlowNode): FlowNode => ({
    id: `output-${node.id}`,
    type: "outputNode",
    position: {
      x: node.position.x + 320,
      y: node.position.y,
    },
    data: {
      label: "output",
      autoOutputFor: node.id,
      running: false,
      output: "",
    },
  });

  const withAutoOutputNodes = (
    currentNodes: FlowNode[],
    currentEdges: Edge[],
  ) => {
    const nextNodes = [...currentNodes];
    const nextEdges = [...currentEdges];
    const nodeIds = new Set(nextNodes.map((node) => node.id));
    const existingEdgeKeys = new Set(
      nextEdges.map((edge) => `${edge.source}->${edge.target}`),
    );

    currentNodes
      .filter((node) => node.type !== "outputNode")
      .filter(
        (node) =>
          !currentNodes.some(
            (candidate) =>
              candidate.type === "outputNode" &&
              (candidate.id === `output-${node.id}` ||
                candidate.data?.autoOutputFor === node.id),
          ),
      )
      .filter(
        (node) => !currentEdges.some((edge) => edge.source === node.id),
      )
      .forEach((node) => {
        const outputId = `output-${node.id}`;
        const edgeKey = `${node.id}->${outputId}`;

        if (!nodeIds.has(outputId)) {
          const outputNode = createOutputNodeFor(node);
          nextNodes.push(outputNode);
          nodeIds.add(outputId);
        }

        if (!existingEdgeKeys.has(edgeKey)) {
          nextEdges.push({
            id: `edge-${node.id}-${outputId}`,
            source: node.id,
            target: outputId,
            type: "pulse",
          });
          existingEdgeKeys.add(edgeKey);
        }
      });

    return { nodes: nextNodes, edges: nextEdges };
  };

  const allHistory = Object.values(history)
    .flat()
    .sort((a, b) => b.time - a.time);

  const addNode = (type: NodeType): void => {
    const id = `${type}-${Date.now()}`;

    const newNode: FlowNode = {
      id,
      type: nodeTypeMap[type],
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      },
      data: {
        label: type,
        prompt: "",

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

        ...(type === "imageGen" && {
          running: false,
          image: "",
          output: "",
          model: "",
          provider: "",
          error: false,
        }),

        ...(type === "videoGen" && {
          running: false,
          video: "",
          output: "",
          model: "",
          provider: "",
          error: false,
        }),

        ...(type === "llm" && {
          model: "gemini-2.5-flash",
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

        ...(type === "output" && {
          running: false,
          output: "",
        }),
      },
    };

    setNodes((prev) => [...prev, newNode]);
    setHistory((prev) => ({
      ...prev,
      [id]: [
        ...(prev[id] || []),
        {
          type: "ADD_NODE",
          nodeType: type,
          time: Date.now(),
        },
      ],
    }));
  };

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source === params.target) return;

const sourceNode = nodes.find((n) => n.id === params.source) as any;
    const targetNode = nodes.find((n) => n.id === params.target) as any;

      const sourceLabel = sourceNode?.data?.label ?? params.source;
      const targetLabel = targetNode?.data?.label ?? params.target;

      setEdges((eds) => {
        const exists = eds.some(
          (e) => e.source === params.source && e.target === params.target,
        );

        if (exists) return eds;

        return addEdge(params, eds);
      });

      setHistory((prev) => ({
        ...prev,
        [params.source!]: [
          ...(prev[params.source!] || []),
          {
            type: "CONNECT",
            sourceType: sourceLabel,
            targetType: targetLabel,
            time: Date.now(),
          },
        ],
      }));
    },
    [nodes, setEdges],
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

    const deleted = nodes.find((n) => n.id === menu.nodeId) as any;
    if (!deleted) return;

    setNodes((nds) => nds.filter((n) => n.id !== menu.nodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== menu.nodeId && e.target !== menu.nodeId),
    );

    setHistory((prev) => ({
      ...prev,
      [deleted.id]: [
        ...(prev[deleted.id] || []),
        { type: "DELETE_NODE", nodeType: deleted.data.label, time: Date.now() },
      ],
    }));

    setMenu(null);
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
      /(image|generated-image|workflow-image|pollinations|supabase)/i.test(
        value,
      ));

  const isVideoValue = (value = "") =>
    value.startsWith("data:video/") ||
    /\.(mp4|mov|webm|mpeg|mpg|avi|wmv|3gp)(\?|$)/i.test(value) ||
    (/^https?:\/\//i.test(value) &&
      /(video|generated-video|workflow-video|supabase)/i.test(value));

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
      const message = "Please wait for upload to finish before running the workflow.";
      setNodeOutput(uploadingNode.id, `Error: ${message}`, true);
      return;
    }

    stopWorkflowRef.current = false;
    abortControllerRef.current = new AbortController();
    runOutputsRef.current = {};
    setIsWorkflowRunning(true);
    const graph = withAutoOutputNodes(nodes, edges);
    setNodes(graph.nodes);
    setEdges(graph.edges);

    try {
      if (selectedNode) {
        const selectedGraphNode =
          graph.nodes.find((node) => node.id === selectedNode.id) || selectedNode;
        await runNode(selectedGraphNode, "", graph.nodes, graph.edges);
        const selectedOutput =
          runOutputsRef.current[selectedGraphNode.id] ||
          selectedGraphNode.data?.output ||
          "";
        const outgoing = graph.edges.filter(
          (edge) => edge.source === selectedGraphNode.id,
        );

        for (const edge of outgoing) {
          const nextNode = graph.nodes.find((node) => node.id === edge.target);

          if (nextNode) {
            await runNode(getFreshNode(nextNode), selectedOutput, graph.nodes, graph.edges);
          }
        }
        return;
      }

      const startNodes = graph.nodes.filter(
        (node) => !graph.edges.some((edge) => edge.target === node.id),
      );
      for (const startNode of startNodes) {
        if (stopWorkflowRef.current) break;
        await runNode(startNode, "", graph.nodes, graph.edges);
      }
    } finally {
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
  ) => {
    node = getFreshNode(node);

    if (stopWorkflowRef.current || abortControllerRef.current?.signal.aborted) {
      return;
    }

    setNodes((nds) =>
      nds.map((n) =>
        n.id === node.id ? { ...n, data: { ...n.data, running: true } } : n,
      ),
    );

    const inputs: any = getIncomingData(node.id, graphNodes, graphEdges);
    const incomingNodes = getIncomingNodes(node.id, graphNodes, graphEdges);
    let nodeOutput = incomingOutput;

    if (node.type === "textNode") {
      nodeOutput = node.data.prompt || incomingOutput || "";
    }

    if (node.type === "imageNode") {
      try {
        nodeOutput =
          (await uploadBlobImageForNode(node)) || incomingOutput || "";
      } catch (err) {
        const message = err instanceof Error ? err.message : "Image upload failed";
        showUiError(message);
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? { ...n, data: { ...n.data, uploading: false, error: true } }
              : n,
          ),
        );
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
        (incomingOutput?.startsWith("blob:") ? "" : incomingOutput) ||
        inputs.find((i: any) => i?.uploadedImage)?.uploadedImage ||
        inputs.find((i: any) => i?.image && !i.image.startsWith("blob:"))?.image ||
        "";

      if (!imageUrl) {
        nodeOutput = "Error: Crop node requires an uploaded image URL.";
        setNodeOutput(node.id, nodeOutput, true);
        return;
      }

      try {
        const res = await fetch(
          `${getBackendUrl()}/api/crop-image`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            signal: abortControllerRef.current?.signal,
            body: JSON.stringify({
              imageUrl,
              xPercent: node.data.x || 0,
              yPercent: node.data.y || 0,
              widthPercent: node.data.width || 100,
              heightPercent: node.data.height || 100,
            }),
          },
        );

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
        return;
      }
    }

    if (node.type === "extractFrame") {
      const videoUrl =
        (incomingOutput?.startsWith("blob:") ? "" : incomingOutput) ||
        inputs.find((i: any) => i?.uploadedVideo)?.uploadedVideo ||
        inputs.find((i: any) => i?.video && !i.video.startsWith("blob:"))?.video ||
        "";

      if (!videoUrl) {
        nodeOutput = "Error: Extract Frame node requires an uploaded video URL.";
        setNodeOutput(node.id, nodeOutput, true);
        return;
      }

      try {
        const res = await fetch(
          `${getBackendUrl()}/api/extract-frame`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            signal: abortControllerRef.current?.signal,
            body: JSON.stringify({
              videoUrl,
              timestamp: node.data.time || 0,
              format: node.data.format || "jpg",
            }),
          },
        );

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
      const uploadedImage = inputs.find((i: any) => i?.uploadedImage)
        ?.uploadedImage;
      const nonBlobImage = inputs.find(
        (i: any) => i?.image && !i.image.startsWith("blob:"),
      )?.image;
      const hasImageInput = inputs.some(
        (i: any) => i?.uploadedImage || i?.image,
      );
      const uploadedVideo = inputs.find((i: any) => i?.uploadedVideo)
        ?.uploadedVideo;
      const nonBlobVideo = inputs.find(
        (i: any) => i?.video && !i.video.startsWith("blob:"),
      )?.video;
      const hasVideoInput = inputs.some(
        (i: any) => i?.uploadedVideo || i?.video,
      );
      let imageDataUrl = "";
      let imageSource =
        (incomingOutput && isImageValue(incomingOutput) ? incomingOutput : "") ||
        uploadedImage ||
        nonBlobImage ||
        (hasImageInput &&
        incomingOutput &&
        !incomingOutput.startsWith("blob:")
          ? incomingOutput
          : "");
      const videoSource =
        (incomingOutput && isVideoValue(incomingOutput) ? incomingOutput : "") ||
        uploadedVideo ||
        nonBlobVideo ||
        (hasVideoInput &&
        incomingOutput &&
        !incomingOutput.startsWith("blob:")
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
                  ? { ...n, data: { ...n.data, output: nodeOutput, error: true } }
                  : n,
              ),
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

        const res = await fetch(
          `${getBackendUrl()}/api/run-image`,
          {
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
          },
        );

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
          return;
        }

        nodeOutput = `Error: ${err.message}`;
        setNodeOutput(node.id, nodeOutput, true);
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
        .filter((value: string) => !isImageValue(value) && !isVideoValue(value));
      const inputSource =
        (incomingOutput &&
        !isImageValue(incomingOutput) &&
        !isVideoValue(incomingOutput)
          ? incomingOutput
          : "") ||
        textInputs.join("\n") ||
        "";
      const imageUrl =
        (incomingOutput && isImageValue(incomingOutput) ? incomingOutput : "") ||
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

        const res = await fetch(
          `${getBackendUrl()}/api/run-video`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            signal: abortControllerRef.current?.signal,
            body: JSON.stringify({
              prompt: requestPrompt,
              imageUrl: imageUrl || undefined,
            }),
          },
        );

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
          return;
        }

        nodeOutput = `Error: ${err.message}`;
        setNodeOutput(node.id, nodeOutput, true);
      }
    }

    if (node.type === "llmNode") {
      const promptText = node.data.prompt?.trim() || "";

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
      const inputSource =
        (incomingOutput && !isMediaInput(incomingOutput) ? incomingOutput : "") ||
        textInputs.join("\n") ||
        "";


      const uploadedImage = inputs.find((i: any) => i?.uploadedImage)
        ?.uploadedImage;
      const nonBlobImage = inputs.find(
        (i: any) => i?.image && !i.image.startsWith("blob:"),
      )?.image;
      const hasImageInput = inputs.some(
        (i: any) => i?.uploadedImage || i?.image,
      );
      const uploadedVideo = inputs.find((i: any) => i?.uploadedVideo)
        ?.uploadedVideo;
      const nonBlobVideo = inputs.find(
        (i: any) => i?.video && !i.video.startsWith("blob:"),
      )?.video;
      const hasVideoInput = inputs.some(
        (i: any) => i?.uploadedVideo || i?.video,
      );
      let imageDataUrl = "";
      let imageSource =
        (incomingOutput && isImageValue(incomingOutput) ? incomingOutput : "") ||
        uploadedImage ||
        nonBlobImage ||
        (hasImageInput &&
        incomingOutput &&
        !incomingOutput.startsWith("blob:")
          ? incomingOutput
          : "");
      const videoSource =
        (incomingOutput && isVideoValue(incomingOutput) ? incomingOutput : "") ||
        uploadedVideo ||
        nonBlobVideo ||
        (hasVideoInput &&
        incomingOutput &&
        !incomingOutput.startsWith("blob:")
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

        return;
      }

      const requestPrompt = [
        "Use the connected workflow inputs to complete the user's request directly.",
        "If an image or video is attached, it is the source of truth. Do not describe unrelated scenes or prior outputs.",
        "Do not ask follow-up questions. If details are missing, infer reasonable choices from the provided text and media.",
        inputSource ? `User request from connected text node:\n${inputSource}` : "",
        promptText ? `LLM node instruction:\n${promptText}` : "",
        imageSource || imageDataUrl
          ? "Use the attached image as visual context for the response."
          : "",
        videoSource ? "Use the attached video as visual context for the response." : "",
      ]
        .filter(Boolean)
        .join("\n\n") || "Describe the content.";


      try {
        if (videoSource) {
          setNodeOutput(node.id, "Analyzing video...", false);
        }

        const res = await fetch(
          `${getBackendUrl()}/api/run-llm`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            signal: abortControllerRef.current?.signal,
            body: JSON.stringify({
              prompt:
                requestPrompt ||
                (videoSource ? "Describe the video." : "Describe the image."),
              model: node.data.model || "gemini-2.5-flash",
              imageUrl: imageSource || undefined,
              imageDataUrl: imageDataUrl || undefined,
              videoUrl: videoSource || undefined,
            }),
          },
        );

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
          return;
        }

        nodeOutput = `Error: ${err.message}`;
        setNodeOutput(node.id, nodeOutput, true);
      }
    }

    if (node.type === "outputNode") {
      const prev = inputs[0] as any;
      const outputValue =
        incomingOutput ||
        prev?.output ||
        prev?.uploadedImage ||
        prev?.image ||
        prev?.uploadedVideo ||
        prev?.video ||
        prev?.prompt ||
        "No output yet";

      nodeOutput = outputValue;

      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? { ...n, data: { ...n.data, output: outputValue } }
            : n,
        ),
      );
    }

    if (stopWorkflowRef.current || abortControllerRef.current?.signal.aborted) {
      return;
    }

    runOutputsRef.current[node.id] = nodeOutput;

    const outgoing = graphEdges.filter((e) => e.source === node.id);

    for (const edge of outgoing) {
      if (stopWorkflowRef.current || abortControllerRef.current?.signal.aborted) {
        break;
      }

      const nextNode = graphNodes.find((n) => n.id === edge.target);
      if (nextNode) {
        await runNode(getFreshNode(nextNode), nodeOutput, graphNodes, graphEdges);
      }
    }

    setNodes((nds) =>
      nds.map((n) =>
        n.id === node.id ? { ...n, data: { ...n.data, running: false } } : n,
      ),
    );
  };

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

  const getPersistableNodes = () => {
    return nodes.map((node: any) => {
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

  const saveWorkflow = async () => {
    const workflowId = window.location.pathname.split("/").pop();

    await fetch(
      `${getBackendUrl()}/api/workflow/${workflowId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          nodes: getPersistableNodes(),
          edges,
          history,
        }),
      },
    );
  };

  const exportWorkflowJson = () => {
    const workflowId = window.location.pathname.split("/").pop();
    const payload = {
      id: workflowId,
      name,
      exportedAt: new Date().toISOString(),
      nodes: getPersistableNodes(),
      edges,
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

  useEffect(() => {
    if (!isLoaded) return;
    saveWorkflow();
  }, [nodes, edges, name, history, isLoaded, saveWorkflow]);

  const loadWorkflow = async () => {
    const id = window.location.pathname.split("/").pop();

    const res = await fetch(
      `${getBackendUrl()}/api/workflow/single/${id}`,
    );

    const data = await res.json();

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

    setNodes(attachHandlers(data.nodes || []));
    setEdges(data.edges || []);
    setName(data.name || "Untitled Workflow");
    setHistory(data.history || {});
    setIsLoaded(true);
  };

  useEffect(() => {
    loadWorkflow();
  }, []);

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
      <span className="hidden">
        ☰
      </span>

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

      <div className="flex-1 min-w-0 relative">
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
          panActivationKeyCode={null}
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
          <div className="absolute right-3 top-14 z-50 flex items-center gap-2 md:right-4 md:top-4">
            <button
              onClick={exportWorkflowJson}
              aria-label="Export workflow JSON"
              title="Export workflow JSON"
              className="rounded-md border border-white/10 bg-[#111] p-2 text-white/70 shadow hover:bg-[#1a1a1a] hover:text-white"
            >
              <Download className="size-4" />
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
          </div>
          <div className="absolute left-3 top-14 z-50 md:left-0 md:top-0">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-[min(260px,calc(100vw-6rem))] rounded-md border border-white/10 bg-black/60 px-4 py-2 text-sm text-white outline-none backdrop-blur-md md:ml-5 md:mt-8"
            />
          </div>
          <Background gap={20} size={2} />
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
                  <h2 id="quota-dialog-title" className="text-base font-semibold">
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
            <p className="text-sm leading-relaxed text-white/70">{quotaDialog}</p>
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
                <p className="text-xs text-white/40">{allHistory.length} events</p>
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
                {allHistory.length === 0 && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/45">
                    No history yet.
                  </div>
                )}
                {allHistory.map((h, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-white/5 bg-white/5 p-2.5 text-xs leading-relaxed text-white/70"
                  >
                    {h.type === "ADD_NODE" &&
                      `Added ${(h.nodeType || "Unknown").charAt(0).toUpperCase() + (h.nodeType || "Unknown").slice(1)}`}
                    {h.type === "DELETE_NODE" &&
                      `Deleted ${(h.nodeType || "Unknown").charAt(0).toUpperCase() + (h.nodeType || "Unknown").slice(1)}`}
                    {h.type === "CONNECT" &&
                      `Connected ${(h.sourceType || h.source || "Unknown").charAt(0).toUpperCase() + (h.sourceType || h.source || "Unknown").slice(1)} to ${(h.targetType || h.target || "Unknown").charAt(0).toUpperCase() + (h.targetType || h.target || "Unknown").slice(1)}`}
                  </div>
                ))}
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

