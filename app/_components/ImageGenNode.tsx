import { ImagePlus } from "lucide-react";
import { JSX } from "react";
import { Handle, Position } from "reactflow";

type Props = {
  data: {
    prompt?: string;
    image?: string;
    output?: string;
    model?: string;
    provider?: string;
    running?: boolean;
    error?: boolean;
    onChange?: (value: string) => void;
  };
};

export default function ImageGenNode({ data }: Props): JSX.Element {
  const modelLabel = [data.provider, data.model].filter(Boolean).join(" / ");

  return (
    <div
      className={`w-[120px] md:w-[200px] bg-[#202020] rounded-2xl border text-white overflow-hidden shadow-xl
  ${
    data.running
      ? "border-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.8)] animate-pulse"
      : data.error
        ? "border-red-500"
        : "border-fuchsia-500"
  }`}
    >
      <div className="p-3 text-xs">
        <div className="mb-3 flex items-center justify-between">
          <ImagePlus className="size-4 text-fuchsia-300" />
          <p className="text-white/50">AI Image</p>
        </div>

        <div>
          <p className="text-white/50 mb-1">Prompt</p>
          <textarea
            value={data.prompt || ""}
            onChange={(e) => data.onChange?.(e.target.value)}
            placeholder="Generate or edit image..."
            className="node-scroll w-full min-h-[90px] bg-[#202020] p-2 rounded border border-white/20 outline-none nodrag"
          />
        </div>
        {(data.running || modelLabel) && (
          <p className="mt-2 text-[11px] text-white/45">
            {data.running ? "Generating image..." : `Used ${modelLabel}`}
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
        className="bg-fuchsia-500 w-2 h-2"
      />
    </div>
  );
}
