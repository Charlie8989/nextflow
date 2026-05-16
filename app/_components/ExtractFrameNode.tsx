import { Download, Maximize2 } from "lucide-react";
import { JSX } from "react";
import { Handle, Position } from "reactflow";
import InlineNodeOutput from "./InlineNodeOutput";

type Props = {
  data: {
    time?: string;
    format?: string;
    image?: string;
    output?: string;
    running?: boolean;
    error?: boolean;
    connectedInputs?: Record<string, boolean>;
    onParamChange?: (key: string, value: string) => void;
  };
};

export default function ExtractFrameNode({ data }: Props): JSX.Element {
  const preview = data.output || data.image;
  const hasPreview = Boolean(preview);
  const targetHandleClass =
    "!left-0 !size-3 !translate-x-0 !border !border-black !bg-yellow-400";
  const sourceHandleClass =
    "!right-0 !size-3 !translate-x-0 !border !border-black !bg-purple-400";
  const videoHandleTop = hasPreview ? 166 : 74;
  const timestampHandleTop = hasPreview ? 342 : 86;

  return (
    <div
      className={`w-[min(82vw,300px)] bg-[#111] rounded-lg border text-white overflow-hidden shadow-xl
  ${
    data.running
      ? "border-purple-400 shadow-[0_0_24px_rgba(168,85,247,0.65)] animate-pulse"
      : data.error
        ? "border-red-400/70"
        : "border-white/10"
  }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">
          Extract Frame
        </p>
        {data.running && (
          <span className="text-[10px] text-purple-200">Running</span>
        )}
      </div>
      {preview && (
        <div className="border-b border-white/10 bg-black/25">
          <div className="h-56 flex items-center justify-center p-2">
            <img
              src={preview}
              alt="Extracted frame"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex justify-end gap-1 border-t border-white/10 px-2 py-1">
            <a
              href={preview}
              target="_blank"
              rel="noreferrer"
              title="Open full preview"
              className="nodrag rounded p-1 text-white/55 hover:bg-white/10 hover:text-white"
            >
              <Maximize2 className="size-3.5" />
            </a>
            <a
              href={preview}
              download
              title="Download frame"
              className="nodrag rounded p-1 text-white/55 hover:bg-white/10 hover:text-white"
            >
              <Download className="size-3.5" />
            </a>
          </div>
        </div>
      )}

      <div className="p-3 text-xs">
        <div className="mb-2">
          <p className="mb-1 text-white/45">Timestamp</p>
          <input
            value={data.time || "0"}
            disabled={Boolean(data.connectedInputs?.timestamp)}
            onChange={(e) => data.onParamChange?.("time", e.target.value)}
            placeholder="0 or 50%"
            className="nodrag w-full rounded-md border border-white/10 bg-black/25 p-2 outline-none transition disabled:cursor-not-allowed disabled:opacity-45 focus:border-purple-300/50"
          />
        </div>

        <div>
          <p className="mb-1 text-white/45">Format</p>
          <select
            value={data.format || "jpg"}
            onChange={(e) => data.onParamChange?.("format", e.target.value)}
            className="node-scroll nodrag w-full rounded-md border border-white/10 bg-black/25 p-2 outline-none"
          >
            <option value="jpg">jpg</option>
            <option value="png">png</option>
          </select>
        </div>
      </div>

      <InlineNodeOutput output={data.output && data.output !== preview ? data.output : ""} />

      <Handle
        id="video_url"
        type="target"
        position={Position.Left}
        style={{ top: videoHandleTop, transform: "translateY(-50%)" }}
        className={targetHandleClass}
      />
      <Handle
        id="timestamp"
        type="target"
        position={Position.Left}
        style={{ top: timestampHandleTop, transform: "translateY(-50%)" }}
        className={targetHandleClass}
      />
      <Handle
        id="output"
        type="source"
        position={Position.Right}
        style={{ transform: "translateY(-50%)" }}
        className={sourceHandleClass}
      />
    </div>
  );
}
