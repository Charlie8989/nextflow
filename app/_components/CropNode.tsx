import { Download, Maximize2, Trash2 } from "lucide-react";
import Image from "next/image";
import { JSX } from "react";
import { Handle, Position } from "reactflow";
import InlineNodeOutput from "./InlineNodeOutput";

type Props = {
  data: {
    width?: string;
    height?: string;
    x?: string;
    y?: string;
    image?: string;
    output?: string;
    running?: boolean;
    error?: boolean;
    connectedInputs?: Record<string, boolean>;
    onParamChange?: (key: string, value: string) => void;
    onDelete?: () => void;
  };
};

export default function CropNode({ data }: Props): JSX.Element {
  const preview = data.output || data.image;
  const hasPreview = Boolean(preview);
  const targetHandleClass =
    "!left-0 !size-3 !translate-x-0 !border !border-black !bg-yellow-400";
  const sourceHandleClass =
    "!right-0 !size-3 !translate-x-0 !border !border-black !bg-purple-400";
  const imageHandleTop = hasPreview ? 166 : 76;
  const firstFieldTop = hasPreview ? 342 : 86;

  const input = (key: string, label: string, fallback: string) => (
    <div className="mb-2">
      <p className="mb-1 text-white/45">{label}</p>
      <input
        value={(data as any)[key] || fallback}
        disabled={Boolean(data.connectedInputs?.[`${key}_percent`])}
        onChange={(e) => data.onParamChange?.(key, e.target.value)}
        className="nodrag w-full rounded-md border border-white/10 bg-black/25 p-2 outline-none transition disabled:cursor-not-allowed disabled:opacity-45 focus:border-purple-300/50"
      />
    </div>
  );

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
          Crop Image
        </p>
        <div className="flex items-center gap-2">
          {data.running && (
            <span className="text-[10px] text-purple-200">Running</span>
          )}
          <button
            type="button"
            aria-label="Delete node"
            title="Delete node"
            onClick={(event) => {
              event.stopPropagation();
              data.onDelete?.();
            }}
            className="nodrag nopan rounded p-1 text-white/35 hover:bg-red-500/10 hover:text-red-300"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      {preview && (
        <div className="border-b border-white/10 bg-black/25">
          <div className="relative h-56 p-2">
            <Image
              src={preview}
              alt="Crop preview"
              fill
              sizes="300px"
              unoptimized={
                preview.startsWith("data:") || preview.startsWith("blob:")
              }
              className="p-2 object-contain"
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
              title="Download cropped image"
              className="nodrag rounded p-1 text-white/55 hover:bg-white/10 hover:text-white"
            >
              <Download className="size-3.5" />
            </a>
          </div>
        </div>
      )}

      <div className="p-3 text-xs">
        {input("width", "Width %", "100")}
        {input("height", "Height %", "100")}
        {input("x", "X %", "0")}
        {input("y", "Y %", "0")}
      </div>

      <InlineNodeOutput output={data.output && data.output !== preview ? data.output : ""} />

      <Handle
        id="image_url"
        type="target"
        position={Position.Left}
        style={{ top: imageHandleTop, transform: "translateY(-50%)" }}
        className={targetHandleClass}
      />
      <Handle
        id="width_percent"
        type="target"
        position={Position.Left}
        style={{ top: firstFieldTop, transform: "translateY(-50%)" }}
        className={targetHandleClass}
      />
      <Handle
        id="height_percent"
        type="target"
        position={Position.Left}
        style={{ top: firstFieldTop + 58, transform: "translateY(-50%)" }}
        className={targetHandleClass}
      />
      <Handle
        id="x_percent"
        type="target"
        position={Position.Left}
        style={{ top: firstFieldTop + 116, transform: "translateY(-50%)" }}
        className={targetHandleClass}
      />
      <Handle
        id="y_percent"
        type="target"
        position={Position.Left}
        style={{ top: firstFieldTop + 174, transform: "translateY(-50%)" }}
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
