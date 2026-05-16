import type { Edge, Node } from "reactflow";
import mergedWorkflowJson from "./examples/Merged-Workflow.json";
import sampleWorkflow1Json from "./examples/Sample-Workflow-1.json";
import sampleWorkflow2Json from "./examples/Sample-Workflow-2.json";

export type ExampleWorkflow = {
  id: string;
  name: string;
  description?: string;
  image?: string;
  nodes: Node[];
  edges: Edge[];
};

type ExportedWorkflow = {
  name: string;
  nodes: Node[];
  edges: Edge[];
};

type ExampleWorkflowMeta = {
  id: string;
  name: string;
  description: string;
};

const isImageUrl = (value: unknown): value is string =>
  typeof value === "string" &&
  /^https?:\/\//i.test(value) &&
  /\.(png|jpe?g|webp|gif)(\?|$)/i.test(value);

const getExampleImage = (workflow: ExportedWorkflow) => {
  for (const node of workflow.nodes) {
    const data = node.data || {};
    const candidates = [
      data.uploadedImage,
      data.image,
      data.output,
      data.uploadedVideo,
      data.video,
    ];
    const image = candidates.find(isImageUrl);

    if (image) return image;
  }

  return undefined;
};

const createExampleWorkflow = (
  workflow: ExportedWorkflow,
  meta: ExampleWorkflowMeta,
): ExampleWorkflow => ({
  id: meta.id,
  name: meta.name || workflow.name,
  description: meta.description,
  image: getExampleImage(workflow),
  nodes: workflow.nodes,
  edges: workflow.edges,
});

const sampleWorkflow1 = sampleWorkflow1Json as unknown as ExportedWorkflow;
const sampleWorkflow2 = sampleWorkflow2Json as unknown as ExportedWorkflow;
const mergedWorkflow = mergedWorkflowJson as unknown as ExportedWorkflow;

export const exampleWorkflows: ExampleWorkflow[] = [
  createExampleWorkflow(sampleWorkflow1, {
    id: "sample-workflow-1",
    name: "Sample Workflow-1",
    description: "Product image crop and marketing description workflow.",
  }),
  createExampleWorkflow(sampleWorkflow2, {
    id: "sample-workflow-2",
    name: "Sample Workflow - 2",
    description: "Extract a video frame and generate a social media post.",
  }),
  createExampleWorkflow(mergedWorkflow, {
    id: "merged-workflow",
    name: "Merged Workflow",
    description:
      "Combined product image, crop, video frame, and fast marketing post workflow.",
  }),
];
