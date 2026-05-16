import { Clapperboard, Trash2 } from "lucide-react";
import { JSX } from "react";
import { Handle, Position } from "reactflow";

type Props = {
  data: {
    prompt?: string;
    model?: string;
    provider?: string;
    running?: boolean;
    error?: boolean;
    onChange?: (value: string) => void;
    onDelete?: () => void;
  };
};

export default function VideoGenNode({ data }: Props): JSX.Element {
  const modelLabel = [data.provider, data.model].filter(Boolean).join(" / ");
  const targetHandleClass =
    "!left-0 !size-3 !translate-x-0 !border !border-black !bg-yellow-400";
  const sourceHandleClass =
    "!right-0 !size-3 !translate-x-0 !border !border-black !bg-sky-500";

  return (
    <div
      className={`w-[min(82vw,260px)] md:w-[220px] bg-[#202020] rounded-lg border text-white overflow-hidden shadow-xl
  ${
    data.running
      ? "border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.8)] animate-pulse"
      : data.error
        ? "border-red-500"
        : "border-sky-500"
  }`}
    >
      <div className="p-3 text-xs">
        <div className="mb-3 flex items-center justify-between">
          <Clapperboard className="size-4 text-sky-300" />
          <div className="flex items-center gap-2">
            <p className="text-white/50">AI Video</p>
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

        <div className="mb-3">
          <p className="text-white/50 mb-1">Prompt</p>
          <textarea
            value={data.prompt || ""}
            onChange={(e) => data.onChange?.(e.target.value)}
            onKeyDownCapture={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUpCapture={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            placeholder="Animate this image..."
            className="node-scroll nopan nowheel w-full min-h-[90px] bg-[#202020] p-2 rounded border border-white/20 outline-none nodrag"
          />
        </div>

        {(data.running || modelLabel) && (
          <p className="mt-2 text-[11px] text-white/45">
            {data.running ? "Generating video..." : `Used ${modelLabel}`}
          </p>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        style={{ transform: "translateY(-50%)" }}
        className={targetHandleClass}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ transform: "translateY(-50%)" }}
        className={sourceHandleClass}
      />
    </div>
  );
}
