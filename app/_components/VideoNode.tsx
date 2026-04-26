import { UploadIcon, Video } from "lucide-react";
import { JSX, useRef } from "react";
import { Handle, Position } from "reactflow";

type Props = {
  data: {
    video?: string;
    running?: boolean;
    uploading?: boolean;
    error?: boolean;
    errorMessage?: string;
    onUpload?: (file: File) => void;
  };
};

export default function VideoNode({ data }: Props): JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null);
  const openFilePicker = () => fileRef.current?.click();

  return (
    <div className={`w-45 bg-[#202020] rounded-2xl border text-white overflow-hidden shadow-xl
  ${
    data.running
      ? "border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.8)] animate-pulse"
      : "border-cyan-500"
      }`}>
      <div
        onClick={!data.video && !data.uploading ? openFilePicker : undefined}
        className={`relative h-40 flex items-center justify-center border-b border-white/70 ${
          !data.video && !data.uploading ? "cursor-pointer" : ""
        }`}
      >
        {data.uploading ? (
          <span className="absolute inset-0 bg-black/70 text-white/70 flex flex-col items-center justify-center text-sm">
            Uploading...
          </span>
        ) : data.error ? (
          <span className="px-3 text-center text-red-400 text-sm">
            {data.errorMessage || "Upload failed"}
          </span>
        ) : data.video ? (
          <>
            <video
              src={data.video}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              aria-label="Replace video"
              title="Replace video"
              onClick={openFilePicker}
              className="nodrag absolute top-2 right-2 rounded bg-black/70 p-1.5 text-white/80 hover:bg-black hover:text-white"
            >
              <UploadIcon className="size-4" />
            </button>
          </>
        ) : (
          <span className="text-white/40 flex flex-col items-center">
            <Video className="size-8 mb-1" />
            Upload Video
          </span>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        style={{ display: "none" }}
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
