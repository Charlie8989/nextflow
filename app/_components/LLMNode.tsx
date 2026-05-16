import { JSX, useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals } from "reactflow";
import InlineNodeOutput from "./InlineNodeOutput";

type Props = {
  id: string;
  data: {
    model?: string;
    output?: string;
    running?: boolean;
    error?: boolean;
    onModelChange?: (value: string) => void;
  };
};

export default function LLMNode({ id, data }: Props): JSX.Element {
  const updateNodeInternals = useUpdateNodeInternals();
  const selectedModel = data.model?.startsWith("gemini-")
    ? data.model
    : "gemini-2.5-flash";
  const targetHandleClass =
    "!left-0 !size-3 !translate-x-0 !border !border-black !bg-yellow-400";
  const sourceHandleClass =
    "!right-0 !size-3 !translate-x-0 !border !border-black !bg-purple-400";

  useEffect(() => {
    updateNodeInternals(id);
  }, [data.output, data.running, id, updateNodeInternals]);

  return (
    <div
      className={`w-[min(82vw,340px)] bg-[#111] rounded-lg border text-white overflow-hidden shadow-xl
  ${
    data.running
      ? "border-purple-400 shadow-[0_0_24px_rgba(168,85,247,0.65)] animate-pulse"
      : data.error
        ? "border-red-400/70"
        : "border-white/10"
  }`}
    >
      <div className="border-b border-white/10 px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">
            LLM
          </p>
          {data.running && (
            <span className="text-[10px] text-purple-200">Running</span>
          )}
        </div>
      </div>

      <div className="p-3 text-xs">
        <div className="mb-3">
          <p className="mb-1 text-white/45">Model</p>
          <select
            value={selectedModel}
            onChange={(e) => data.onModelChange?.(e.target.value)}
            className="node-scroll nodrag w-full rounded-md border border-white/10 bg-black/25 p-2 outline-none"
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
          </select>
        </div>
        <div className="space-y-2 text-[11px] text-white/45">
          <div className="relative rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
            <Handle
              id="system_prompt"
              type="target"
              position={Position.Left}
              style={{ transform: "translateY(-50%)" }}
              className={targetHandleClass}
            />
            system_prompt
          </div>
          <div className="relative rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
            <Handle
              id="user_message"
              type="target"
              position={Position.Left}
              style={{ transform: "translateY(-50%)" }}
              className={targetHandleClass}
            />
            user_message
          </div>
          <div className="relative rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
            <Handle
              id="images"
              type="target"
              position={Position.Left}
              style={{ transform: "translateY(-50%)" }}
              className={targetHandleClass}
            />
            images
          </div>
        </div>
      </div>

      <InlineNodeOutput output={data.output} title="Response" />

      <Handle
        id="output"
        type="source"
        position={Position.Right}
        style={{ transform: "translateY(-50%)" }}
        className={sourceHandleClass}
      />
    </div>
  );
}
