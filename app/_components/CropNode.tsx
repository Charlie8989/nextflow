import { Download, Maximize2 } from "lucide-react";
import { JSX } from "react";
import { Handle, Position } from "reactflow";

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
    onParamChange?: (key: string, value: string) => void;
  };
};

export default function CropNode({ data }: Props): JSX.Element {
  const preview = data.output || data.image;

  const input = (key: string, label: string, fallback: string) => (
    <div className="mb-2">
      <p className="text-white/50 mb-1">{label}</p>
      <input
        value={(data as any)[key] || fallback}
        onChange={(e) => data.onParamChange?.(key, e.target.value)}
        className="w-full bg-[#202020] p-1 rounded border border-white/20 outline-none nodrag"
      />
    </div>
  );

  return (
    <div
      className={`w-[120px] md:w-[200px] bg-[#202020] rounded-2xl border text-white overflow-hidden shadow-xl
  ${
    data.running
      ? "border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.8)] animate-pulse"
      : data.error
        ? "border-red-500"
        : "border-cyan-500"
  }`}
    >
      {preview && (
        <div className="border-b border-white/10 bg-black/30">
          <div className="h-56 flex items-center justify-center p-2">
            <img
              src={preview}
              alt="Crop preview"
              className="w-full h-full object-contain"
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
        <div className="mb-3 text-end">
          <p className="text-white/50 mb-1">Crop</p>
        </div>

        {input("width", "Width %", "100")}
        {input("height", "Height %", "100")}
        {input("x", "X %", "0")}
        {input("y", "Y %", "0")}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="bg-yellow-500 w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="bg-green-500 w-2 h-2"
      />
    </div>
  );
}
