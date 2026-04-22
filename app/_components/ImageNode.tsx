import { UploadIcon } from "lucide-react";
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

export default function ImageNode({ data }: Props): JSX.Element {
  return (
    <div className="w-[100px]  md:w-[180px] bg-[#202020] rounded-2xl border border-blue-500 text-white overflow-hidden shadow-xl">
      <div className="relative w-full h-30 border-b  md:h-44 bg-[#202020] flex items-center justify-center rounded-t-2xl overflow-hidden border-b-white/70">
        {data.image ? (
          <img src={data.image} className="w-full h-full object-cover " />
        ) : (
          <span className="text-white/40 text-sm flex flex-col items-center justify-center">
            <UploadIcon className="size-6 md:size-10 mb-1" />
            Upload Image
          </span>
        )}
      </div>

      {/* <div className="p-3 text-xs ">
        <div className="mb-3 text-end ">
          <p className="text-white/50 mb-1">Image</p>
        </div>

        <div className="mb-3">
          <p className="text-white/50 mb-1">Prompt</p>
          <textarea
            defaultValue={data.prompt || ""}
            placeholder="Describe your image..."
             className="w-full min-h-[100px] bg-[#202020] p-2 rounded-lg nodrag outline-none border border-white/20 focus:border-white/40"
          />
        </div>

        
      </div> */}

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
