import { JSX } from "react";
import { Handle, Position } from "reactflow";

type Props = {
  data: {
    time?: string;
    format?: string;
    running?: boolean;
  };
};

export default function ExtractFrameNode({ data }: Props): JSX.Element {
  return (
    <div
      className={`w-[100px] md:w-[180px] bg-[#202020] rounded-2xl border text-white overflow-hidden shadow-xl
  ${
    data.running
      ? "border-red-500 shadow-[0_0_20px_rgba(34,197,94,0.8)] animate-pulse"
      : "border-orange-500"
  }`}
    >
      <div className="p-3 text-xs">
        <div className="mb-3 text-end">
          <p className="text-white/50 mb-1">Frame</p>
        </div>

        <div className="mb-2">
          <p className="text-white/50 mb-1">Time (s)</p>
          <input
            defaultValue={data.time || ""}
            className="w-full bg-[#202020] p-1 rounded border border-white/20 outline-none"
          />
        </div>

        <div>
          <p className="text-white/50 mb-1">Format</p>
          <input
            defaultValue={data.format || "png"}
            className="w-full bg-[#202020] p-1 rounded border border-white/20 outline-none"
          />
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="bg-yellow-500 w-10 h-10" />
      <Handle type="source" position={Position.Right} className="bg-red-500 w-2 h-2" />
    </div>
  );
}