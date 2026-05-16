import { JSX } from "react";
import { Handle, Position } from "reactflow";
import InlineNodeOutput from "./InlineNodeOutput";

type Props = {
  data: {
    image?: string;
    prompt?: string;
    quality?: string;
    style?: string;
    running?: boolean;
    output?: string;
    error?: boolean;
    onChange?: (value: string) => void;
  };
};

export default function TextNode({ data }: Props): JSX.Element {
  const prompt = data.prompt || "";
  const textareaRows = Math.min(
    12,
    Math.max(4, Math.ceil(prompt.length / 44) + prompt.split("\n").length),
  );
  const targetHandleClass =
    "!left-0 !size-3 !translate-x-0 !border !border-black !bg-yellow-400";
  const sourceHandleClass =
    "!right-0 !size-3 !translate-x-0 !border !border-black !bg-purple-400";

  return (
    <div
      className={`w-[min(86vw,340px)] md:w-[280px] bg-[#111] rounded-lg border text-white overflow-hidden shadow-xl
  ${
    data.running
      ? "border-purple-400 shadow-[0_0_24px_rgba(168,85,247,0.65)] animate-pulse"
      : data.error
        ? "border-red-400/70"
        : "border-white/10"
  }`}
    >
      <div className="border-b border-white/10 px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">
            Text
          </p>
          {data.running && (
            <span className="text-[10px] text-purple-200">Running</span>
          )}
        </div>
      </div>

      <div className="p-3 text-xs">
        <div className="mb-3">
          <p className="mb-1 text-white/45">Input</p>
          <textarea
            value={prompt}
            rows={textareaRows}
            onChange={(e) => data.onChange?.(e.target.value)}
            onKeyDownCapture={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUpCapture={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            placeholder="Enter Text"
            className="node-scroll nodrag nopan nowheel min-h-[104px] max-h-[320px] w-full rounded-md border border-white/10 bg-black/25 p-2 outline-none transition focus:border-purple-300/50"
          />
        </div>
      </div>

      <InlineNodeOutput output={data.output} title="Output" />

      <Handle
        type="target"
        position={Position.Left}
        isConnectable={true}
        style={{ transform: "translateY(-50%)" }}
        className={targetHandleClass}
      />

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={true}
        style={{ transform: "translateY(-50%)" }}
        className={sourceHandleClass}
      />
    </div>
  );
}
