import { Trash2, UploadIcon } from "lucide-react";
import Image from "next/image";
import { JSX, useRef } from "react";
import { Handle, Position } from "reactflow";
import InlineNodeOutput from "./InlineNodeOutput";

type Props = {
  data: {
    image?: string;
    uploadedImage?: string;
    output?: string;
    running?: boolean;
    uploading?: boolean;
    error?: boolean;
    onUpload?: (file: File) => void;
    onDelete?: () => void;
  };
};

export default function ImageNode({ data }: Props): JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null);
  const openFilePicker = () => fileRef.current?.click();
  const preview = data.uploadedImage || data.output || data.image || "";
  const targetHandleClass =
    "!left-0 !size-3 !translate-x-0 !border !border-black !bg-yellow-400";
  const sourceHandleClass =
    "!right-0 !size-3 !translate-x-0 !border !border-black !bg-purple-400";

  return (
    <div className={`w-[min(82vw,320px)] bg-[#111] rounded-lg border text-white overflow-hidden shadow-xl
  ${
    data.running
      ? "border-purple-400 shadow-[0_0_24px_rgba(168,85,247,0.65)] animate-pulse"
      : data.error
        ? "border-red-400/70"
        : "border-white/10"
      }`}>
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">
          Upload Image
        </p>
        <div className="flex items-center gap-2">
          {data.running && (
            <span className="text-[10px] text-purple-200">Running</span>
          )}
          <button
            type="button"
            aria-label="Delete node"
            title="Delete node"
            onClick={(event) => {
              event.stopPropagation();
              data.onDelete?.();
            }}
            className="nodrag nopan rounded p-1 text-white/35 hover:bg-red-500/10 hover:text-red-300"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <div
        onClick={!preview && !data.uploading ? openFilePicker : undefined}
        className={`relative flex min-h-40 w-full items-center justify-center overflow-hidden bg-black/25 ${
          !preview && !data.uploading ? "cursor-pointer" : ""
        }`}
      >
        {preview ? (
          <>
            <Image
              src={preview}
              alt="preview"
              width={640}
              height={420}
              sizes="320px"
              unoptimized={
                preview.startsWith("data:") || preview.startsWith("blob:")
              }
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

      <InlineNodeOutput output={data.output && data.output !== preview ? data.output : ""} />

      <Handle
        type="target"
        position={Position.Left}
        style={{ transform: "translateY(-50%)" }}
        className={targetHandleClass}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ transform: "translateY(-50%)" }}
        className={sourceHandleClass}
      />
    </div>
  );
}
