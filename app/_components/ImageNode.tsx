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
       <div className="relative w-full h-44 bg-[#202020] flex items-center justify-center rounded-t-2xl overflow-hidden border-b-white/70">
        {data.image ? (
          <img src={data.image} className="w-full h-full object-cover " />
        ) : (
          <span className="text-white/40 text-sm">Upload Image</span>
        )}
      </div>

      <div className="p-3 text-xs">
        <div className="mb-3 text-end ">
          <p className="text-white/50 mb-1">Image</p>
        </div>

        <div className="mb-3">
          <p className="text-white/50 mb-1">Model</p>

          <div className="relative">
            <select
              defaultValue="gemini"
              className="w-full bg-[#202020] text-white text-sm p-2 pr-8 rounded-lg border border-white/10 
                 outline-none focus:border-blue-500 focus:ring-0 appearance-none cursor-not-allowed"
              disabled
            >
              <option value="gemini">Gemini</option>
              <option disabled>GPT-4 (Coming soon)</option>
              <option disabled>Claude (Coming soon)</option>
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-white/40">
              ▼
            </div>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-white/50 mb-1">Prompt</p>
          <textarea
            defaultValue={data.prompt || ""}
            placeholder="Describe your image..."
             className="w-full min-h-[60px] bg-[#202020] p-2 rounded-lg nodrag outline-none border border-white/20 focus:border-white/40"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <p className="text-white/50 mb-1">Quality</p>
            <select className="w-full bg-[#202020] p-2 rounded-lg">
              <option>1K</option>
              <option>2K</option>
              <option>4K</option>
            </select>
          </div>

          <div>
            <p className="text-white/50 mb-1">Style</p>
            <select className="w-full bg-[#202020] p-2 rounded-lg">
              <option>Realistic</option>
              <option>Anime</option>
              <option>Cinematic</option>
            </select>
          </div>
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
