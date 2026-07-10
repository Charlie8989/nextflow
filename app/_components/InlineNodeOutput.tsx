import { Download, Maximize2 } from "lucide-react";
import Image from "next/image";
import { JSX, WheelEvent } from "react";

type Props = {
  output?: string;
  title?: string;
};

const isImageOutput = (output: string) =>
  output.startsWith("data:image/") ||
  /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(output) ||
  (/^https?:\/\//i.test(output) &&
    /(image|generated-image|workflow-image|pollinations|supabase)/i.test(
      output,
    ));

const isVideoOutput = (output: string) =>
  output.startsWith("data:video/") ||
  /\.(mp4|mov|webm|mpeg|mpg|avi|wmv|3gp)(\?|$)/i.test(output) ||
  (/^https?:\/\//i.test(output) &&
    /(video|generated-video|workflow-video|supabase)/i.test(output));

const normalizeText = (value: string) =>
  value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^\s*[*-]\s+/gm, "- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export default function InlineNodeOutput({
  output = "",
  title = "Output",
}: Props): JSX.Element | null {
  if (!output) return null;

  const isError = output.startsWith("Error:");
  const isImage = isImageOutput(output);
  const isVideo = isVideoOutput(output);
  const cleanOutput = isError ? output.replace(/^Error:\s*/, "") : output;

  const downloadText = () => {
    const blob = new Blob([cleanOutput], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `node-output-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border-t border-white/10 bg-black/25">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-white/40">
          {isError ? "Error" : title}
        </span>
        <div className="flex items-center gap-1">
          {(isImage || isVideo) && (
            <a
              href={cleanOutput}
              target="_blank"
              rel="noreferrer"
              title="Open output"
              className="nodrag rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
            >
              <Maximize2 className="size-3.5" />
            </a>
          )}
          {!isImage && !isVideo && !isError && (
            <button
              type="button"
              onClick={downloadText}
              title="Download text"
              className="nodrag rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
            >
              <Download className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="px-3 pb-3">
        {isImage ? (
          <div className="flex max-h-[280px] items-center justify-center overflow-hidden rounded-md bg-black/35">
            <Image
              src={cleanOutput}
              alt="Node output"
              width={640}
              height={360}
              sizes="300px"
              unoptimized={
                cleanOutput.startsWith("data:") ||
                cleanOutput.startsWith("blob:")
              }
              className="max-h-[280px] w-full object-contain"
            />
          </div>
        ) : isVideo ? (
          <div className="flex max-h-[280px] items-center justify-center overflow-hidden rounded-md bg-black/35">
            <video
              src={cleanOutput}
              controls
              className="max-h-[280px] w-full object-contain"
            />
          </div>
        ) : (
          <div
            className={`node-scroll nodrag nowheel max-h-[260px] overflow-y-auto whitespace-pre-wrap break-words rounded-md border p-2 text-xs leading-relaxed ${
              isError
                ? "border-red-400/25 bg-red-950/30 text-red-100"
                : "border-white/10 bg-white/[0.03] text-white/75"
            }`}
            onWheel={(event: WheelEvent<HTMLDivElement>) =>
              event.stopPropagation()
            }
          >
            {normalizeText(cleanOutput)}
          </div>
        )}
      </div>
    </div>
  );
}
