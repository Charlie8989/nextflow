import { JSX } from "react";
import { Download } from "lucide-react";
import { Handle, Position } from "reactflow";

type Props = {
  data: {
    output?: string;
    running?: boolean;
  };
};

export default function OutputNode({ data }: Props): JSX.Element {
  const output = data.output || "";
  const errorText = output.replace(/^Error:\s*/, "");
  const normalizeOutputText = (value: string) =>
    value
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/^\s*[*-]\s+/gm, "- ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  const renderTextOutput = (value: string) =>
    normalizeOutputText(value)
      .split(/\n{2,}/)
      .filter(Boolean)
      .map((block, index) => {
        const lines = block.split("\n").filter(Boolean);
        const isList = lines.every((line) => line.trim().startsWith("- "));

        if (isList) {
          return (
            <ul key={index} className="space-y-2">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-white/35" />
                  <span>{line.replace(/^-\s*/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="leading-relaxed">
            {lines.join(" ")}
          </p>
        );
      });
  const isImageOutput =
    output.startsWith("data:image/") ||
    /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(output) ||
    (/^https?:\/\//i.test(output) &&
      /(image|generated-image|workflow-image|pollinations|supabase)/i.test(
        output,
      ));
  const isVideoOutput =
    output.startsWith("data:video/") ||
    /\.(mp4|mov|webm|mpeg|mpg|avi|wmv|3gp)(\?|$)/i.test(output) ||
    (/^https?:\/\//i.test(output) &&
      /(video|generated-video|workflow-video|supabase)/i.test(output));
  const isError = output.startsWith("Error:");
  const isTextOutput = Boolean(output) && !isImageOutput && !isVideoOutput;
  const friendlyError = /quota|rate limit|exceeded|too many requests/i.test(
    errorText,
  )
    ? "Provider quota reached. Wait a moment, then run again."
    : errorText || "The node failed while running.";
  const downloadTextOutput = () => {
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `workflow-output-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const stopCanvasWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div
      className={`w-[280px] max-w-[280px] bg-[#202020] rounded-lg border text-white overflow-hidden shadow-xl
      ${
        data.running
          ? "border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.8)] animate-pulse"
          : isError
            ? "border-red-500"
            : "border-purple-500"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="text-[11px] uppercase tracking-wide text-white/45">
          Output
        </span>
        <div className="flex items-center gap-1">
          {isTextOutput && !isError && (
            <button
              type="button"
              onClick={downloadTextOutput}
              title="Download text"
              className="nodrag rounded p-1 text-white/55 hover:bg-white/10 hover:text-white"
            >
              <Download className="size-3.5" />
            </button>
          )}
          {isError && <span className="text-[11px] text-red-300">Error</span>}
        </div>
      </div>

      <div className="w-full min-h-[120px] max-h-[420px] p-3 text-left text-sm">
        {isImageOutput ? (
          <div className="flex max-h-[360px] items-center justify-center overflow-hidden">
            <img
              src={output}
              alt="Workflow output"
              className="w-full max-h-[360px] object-contain"
            />
          </div>
        ) : isVideoOutput ? (
          <div className="flex max-h-[360px] items-center justify-center overflow-hidden">
            <video
              src={output}
              controls
              className="w-full max-h-[360px] object-contain"
            />
          </div>
        ) : isError ? (
          <div className="w-full rounded-md border border-red-400/20 bg-red-950/20 p-3">
            <p className="mb-1 text-sm font-medium text-red-100">Run failed</p>
            <p className="text-xs leading-relaxed text-red-100/70">
              {friendlyError}
            </p>
          </div>
        ) : output ? (
          <div
            onWheel={stopCanvasWheel}
            className={`node-scroll output-scroll nodrag nowheel w-full max-h-[390px] overflow-y-auto overflow-x-hidden break-words pr-2 ${
              isError ? "text-red-200" : "text-white/90"
            }`}
          >
            <div className="space-y-4">{renderTextOutput(output)}</div>
          </div>
        ) : (
          <div className="flex min-h-[96px] items-center justify-center">
            <span className="text-white/40">Output will appear here</span>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="bg-yellow-500 w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="bg-purple-500 w-2 h-2"
      />
    </div>
  );
}
