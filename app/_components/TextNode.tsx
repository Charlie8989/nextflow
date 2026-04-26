import { JSX, SyntheticEvent } from "react";
import { Handle, Position } from "reactflow";

type Props = {
  data: {
    image?: string;
    prompt?: string;
    quality?: string;
    style?: string;
    running?: boolean;
    onChange?: (value: string) => void;
  };
};

const stopCanvasShortcut = (event: SyntheticEvent<HTMLTextAreaElement>) => {
  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation?.();
};

export default function TextNode({ data }: Props): JSX.Element {
  return (
    <div
      className={`w-[min(82vw,260px)] md:w-[180px] bg-[#202020] rounded-2xl border text-white overflow-hidden shadow-xl
  ${
    data.running
      ? "border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.8)] animate-pulse"
      : "border-cyan-500"
  }`}
    >
      <div className="p-3 text-xs">
        <div className="mb-3 text-end ">
          <p className="text-white/50 mb-1">Text</p>
        </div>

        <div className="mb-3">
          <p className="text-white/50 mb-1">Input</p>
          <textarea
            value={data.prompt || ""}
            onChange={(e) => data.onChange?.(e.target.value)}
            onBeforeInput={stopCanvasShortcut}
            onInput={stopCanvasShortcut}
            onKeyDownCapture={stopCanvasShortcut}
            onKeyDown={stopCanvasShortcut}
            onKeyUpCapture={stopCanvasShortcut}
            onKeyUp={stopCanvasShortcut}
            onPointerDownCapture={stopCanvasShortcut}
            onPointerDown={stopCanvasShortcut}
            onTouchStartCapture={stopCanvasShortcut}
            onTouchStart={stopCanvasShortcut}
            placeholder="Enter Text"
            className="node-scroll nodrag nopan nowheel w-full min-h-[150px] md:min-h-[120px] bg-transparent p-2 rounded-lg outline-none border border-white/20 focus:border-white/40"
          />
        </div>
      </div>

      <Handle type="target" position={Position.Left} isConnectable={true} />

      <Handle type="source" position={Position.Right} isConnectable={true} />
    </div>
  );
}
