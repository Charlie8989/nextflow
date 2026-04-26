import { JSX } from "react";
import { Handle, Position } from "reactflow";

type Props = {
  data: {
    prompt?: string;
    model?: string;
    running?: boolean;
    onChange?: (value: string) => void;
    onModelChange?: (value: string) => void;
  };
};

export default function LLMNode({ data }: Props): JSX.Element {
  const selectedModel = data.model?.startsWith("gemini-")
    ? data.model
    : "gemini-2.5-flash";

  return (
    <div
      className={`w-[100px] md:w-[180px] bg-[#202020] rounded-2xl border text-white overflow-hidden shadow-xl
  ${
    data.running
      ? "border-purple-500 shadow-[0_0_20px_rgba(34,197,94,0.8)] animate-pulse"
      : "border-blue-500"
  }`}
    >
      <div className="p-3 text-xs">
        <div className="mb-3 text-end">
          <p className="text-white/50 mb-1">LLM</p>
        </div>

        <div className="mb-3">
          <p className="text-white/50 mb-1">Prompt</p>
          <textarea
            value={data.prompt || ""}
            onChange={(e) => data.onChange?.(e.target.value)}
            className="node-scroll w-full min-h-[80px] bg-[#202020] p-2 rounded border border-white/20 outline-none"
          />
        </div>

        <div>
          <p className="text-white/50 mb-1">Model</p>
          <select
            value={selectedModel}
            onChange={(e) => data.onModelChange?.(e.target.value)}
            className="node-scroll w-full bg-[#202020] p-1 rounded border border-white/20 outline-none"
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
          </select>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="bg-yellow-500 w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="bg-purple-500 w-2 h-2"
      />
    </div>
  );
}
