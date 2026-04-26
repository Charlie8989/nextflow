import { UploadIcon } from "lucide-react";
import { JSX, useRef } from "react";
import { Handle, Position } from "reactflow";

type Props = {
  data: {
    image?: string;
    running?: boolean;
    uploading?: boolean;
    error?: boolean;
    onUpload?: (file: File) => void;
  };
};

export default function ImageNode({ data }: Props): JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null);
  const openFilePicker = () => fileRef.current?.click();

  return (
    <div className={`min-w-[100px] md:min-w-[180px] bg-[#202020] rounded-2xl border text-white overflow-hidden shadow-xl
  ${
    data.running
      ? "border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.8)] animate-pulse"
      : "border-cyan-500"
      }`}>
      <div
        onClick={!data.image && !data.uploading ? openFilePicker : undefined}
        className={`relative w-full border-b border-white/70 overflow-hidden flex items-center justify-center ${
          !data.image && !data.uploading ? "cursor-pointer" : ""
        }`}
      >
        {data.image ? (
          <>
            <img
              src={data.image}
              alt="preview"
              className="w-full h-auto max-h-[300px] object-contain"
            />
            <button
              type="button"
              aria-label="Replace image"
              title="Replace image"
              onClick={openFilePicker}
              className="nodrag absolute top-2 right-2 rounded bg-black/70 p-1.5 text-white/80 hover:bg-black hover:text-white"
            >
              <UploadIcon className="size-4" />
            </button>
          </>
        ) : data.uploading ? (
          <div className="w-full h-32 flex items-center justify-center text-white/50">
            Uploading...
          </div>
        ) : data.error ? (
          <div className="w-full h-32 flex items-center justify-center text-red-400">
            Upload failed
          </div>
        ) : (
          <div className="w-full h-32 flex flex-col items-center justify-center text-white/40">
            <UploadIcon className="size-6 md:size-10 mb-1" />
            Upload Image
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && data.onUpload) data.onUpload(file);
          e.target.value = "";
        }}
      />

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
