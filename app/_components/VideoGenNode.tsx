import { Clapperboard } from "lucide-react";
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
  };
};

export default function VideoGenNode({ data }: Props): JSX.Element {
  const modelLabel = [data.provider, data.model].filter(Boolean).join(" / ");

  return (
    <div
      className={`w-[120px] md:w-[200px] bg-[#202020] rounded-2xl border text-white overflow-hidden shadow-xl
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
          <p className="text-white/50">AI Video</p>
        </div>

        <div className="mb-3">
          <p className="text-white/50 mb-1">Prompt</p>
          <textarea
            value={data.prompt || ""}
            onChange={(e) => data.onChange?.(e.target.value)}
            placeholder="Animate this image..."
            className="node-scroll w-full min-h-[90px] bg-[#202020] p-2 rounded border border-white/20 outline-none nodrag"
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
        className="bg-yellow-500 w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="bg-sky-500 w-2 h-2"
      />
    </div>
  );
}
