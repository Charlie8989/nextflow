import { JSX } from "react";
import { Handle, Position } from "reactflow";

type Props = {
  data: {
    prompt?: string;
    model?: string;
    running?: boolean;
    onChange?: (value: string) => void;
  };
};

export default function LLMNode({ data }: Props): JSX.Element {
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
            className="w-full min-h-[80px] bg-[#202020] p-2 rounded border border-white/20 outline-none"
          />
        </div>

        <div>
          <p className="text-white/50 mb-1">Model</p>
          <select
            defaultValue={data.model || "gpt-4o-mini"}
            className="w-full bg-[#202020] p-1 rounded border border-white/20 outline-none"
          >
            <option value="gpt-4o-mini">Gemini (Free)</option>
            <option disabled>────────────</option>
            <option disabled>gpt-4o (Pro)</option>
            <option disabled>claude-3-opus (Pro)</option>
            <option disabled>gemini-1.5-pro (Pro)</option>
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
