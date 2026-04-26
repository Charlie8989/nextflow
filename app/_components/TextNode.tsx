import { JSX } from "react";
import { Handle, Position } from "reactflow";

type Props = {
  data: {
    image?: string;
    prompt?: string;
    quality?: string;
    style?: string;
    running?: boolean;
    onChange?: (value: string) => void;
  };
};

export default function TextNode({ data }: Props): JSX.Element {
  return (
    <div
      className={`w-[100px] md:w-[180px] bg-[#202020] rounded-2xl border text-white overflow-hidden shadow-xl
  ${
    data.running
      ? "border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.8)] animate-pulse"
      : "border-cyan-500"
  }`}
    >
      <div className="p-3 text-xs">
        <div className="mb-3 text-end ">
          <p className="text-white/50 mb-1">Text</p>
        </div>

        <div className="mb-3">
          <p className="text-white/50 mb-1">Input</p>
          <textarea
            value={data.prompt || ""}
            onChange={(e) => data.onChange?.(e.target.value)}
            placeholder="Enter Text"
            className="node-scroll w-full min-h-[120px] bg-transparent p-2 rounded-lg nodrag outline-none border border-white/20 focus:border-white/40"
          />
        </div>
      </div>

      <Handle type="target" position={Position.Left} isConnectable={true} />

      <Handle type="source" position={Position.Right} isConnectable={true} />
    </div>
  );
}
