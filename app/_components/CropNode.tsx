import { JSX } from "react";
import { Handle, Position } from "reactflow";

type Props = {
  data: {
    width?: string;
    height?: string;
    x?: string;
    y?: string;
  };
};

export default function CropNode({ data }: Props): JSX.Element {
  return (
    <div className="w-[100px] md:w-[180px] bg-[#202020] rounded-2xl border border-green-500 text-white overflow-hidden shadow-xl">
      <div className="p-3 text-xs">
        <div className="mb-3 text-end">
          <p className="text-white/50 mb-1">Crop</p>
        </div>

        <div className="mb-2">
          <p className="text-white/50 mb-1">Width</p>
          <input defaultValue={data.width || ""} className="w-full bg-[#202020] p-1 rounded border border-white/20 outline-none" />
        </div>

        <div className="mb-2">
          <p className="text-white/50 mb-1">Height</p>
          <input defaultValue={data.height || ""} className="w-full bg-[#202020] p-1 rounded border border-white/20 outline-none" />
        </div>

        <div className="mb-2">
          <p className="text-white/50 mb-1">X</p>
          <input defaultValue={data.x || ""} className="w-full bg-[#202020] p-1 rounded border border-white/20 outline-none" />
        </div>

        <div>
          <p className="text-white/50 mb-1">Y</p>
          <input defaultValue={data.y || ""} className="w-full bg-[#202020] p-1 rounded border border-white/20 outline-none" />
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="bg-yellow-500 w-2 h-2" />
      <Handle type="source" position={Position.Right} className="bg-green-500 w-2 h-2" />
    </div>
  );
}