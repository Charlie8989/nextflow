import { BaseEdge, EdgeProps, getBezierPath } from "reactflow";

export default function PulseEdge(props: EdgeProps) {
  const [path] = getBezierPath(props);

  return (
    <>
      <BaseEdge path={path} style={{ strokeWidth: 3 }} />

      <path
        d={path}
        stroke="#3b82f6"
        strokeWidth={4}
        fill="none"
        strokeDasharray="8 8"
        className="animate-pulse-edge"
      />
    </>
  );
}
