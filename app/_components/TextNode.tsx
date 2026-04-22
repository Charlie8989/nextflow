import { JSX } from "react";
import { Handle, Position } from "reactflow";

type Props = {
  data: {
    image?: string;
    prompt?: string;
    quality?: string;
    style?: string;
  };
};

export default function TextNode({ data }: Props): JSX.Element {
  return (
    <div className="w-[100px] border-cyan-400-400 md:w-[180px] bg-[#202020] rounded-2xl border border-cyan-500 text-white overflow-hidden shadow-xl">

      <div className="p-3 text-xs">

        <div className="mb-3 text-end ">
          <p className="text-white/50 mb-1">Text</p>
        </div>

        <div className="mb-3">
          <p className="text-white/50 mb-1">Prompt</p>
          <textarea
            defaultValue={data.prompt || ""}
            placeholder="Describe your image..."
            className="w-full min-h-[120px] bg-[#202020] p-2 rounded-lg nodrag outline-none border border-white/20 focus:border-white/40"
          />
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
        className="bg-blue-500 w-2 h-2"
      />
    </div>
  );
}