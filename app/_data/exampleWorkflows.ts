import type { Edge, Node } from "reactflow";

export type ExampleWorkflow = {
  id: string;
  name: string;
  description?: string;
  image?: string;
  nodes: Node[];
  edges: Edge[];
};

const sampleWorkflowImage =
  "https://hxgqkhpmksawptnwsuoi.supabase.co/storage/v1/object/public/media/workflow-image-1777238418198.jpeg";

const sampleWorkflowOutput =
  "https://hxgqkhpmksawptnwsuoi.supabase.co/storage/v1/object/public/media/workflow-processed-1777238427925-ad5306e1.png";

const sampleWorkflow2Video =
  "https://hxgqkhpmksawptnwsuoi.supabase.co/storage/v1/object/public/media/workflow-video-1777245515750-hdic1lfts9g.mp4";

const sampleWorkflow2Frame =
  "https://hxgqkhpmksawptnwsuoi.supabase.co/storage/v1/object/public/media/workflow-processed-1777245574573-b437469e.jpg";

const sampleWorkflow2Output =
  "Unveiling something special! Get ready to experience the innovation that's got everyone talking. Dive into the details and see the magic for yourself. Shop now! #NewProduct #Innovation #MustHave";

const mergedWorkflowImage =
  "https://hxgqkhpmksawptnwsuoi.supabase.co/storage/v1/object/public/media/workflow-processed-1777377418517-dbf24ef6.jpg";

export const exampleWorkflows: ExampleWorkflow[] = [
  {
    id: "sample-workflow-1",
    name: "Sample Workflow-1",
    description: "Product image crop and marketing description workflow.",
    image: sampleWorkflowImage,
    nodes: [
      {
        id: "image-1777238379072",
        data: {
          error: false,
          image: sampleWorkflowImage,
          label: "image",
          prompt: "",
          running: false,
          uploading: false,
          uploadedImage: sampleWorkflowImage,
        },
        type: "imageNode",
        position: {
          x: 196.71005725832782,
          y: 299.50854053265766,
        },
        width: 300,
        height: 302,
      },
      {
        id: "crop-1777238395617",
        data: {
          x: "50",
          y: "50",
          error: false,
          image: sampleWorkflowOutput,
          label: "crop",
          width: "80",
          height: "80",
          output: sampleWorkflowOutput,
          prompt: "",
          running: false,
          uploadedImage: sampleWorkflowOutput,
        },
        type: "cropNode",
        position: {
          x: 714.1308922285041,
          y: 409.6825640511061,
        },
        width: 200,
        height: 523,
      },
      {
        id: "output-crop-1777238395617",
        data: {
          label: "output",
          output: sampleWorkflowOutput,
          running: false,
          autoOutputFor: "crop-1777238395617",
        },
        type: "outputNode",
        position: {
          x: 1034.130892228504,
          y: 409.6825640511061,
        },
        width: 280,
        height: 314,
      },
      {
        id: "text-1777238420417",
        data: {
          label: "text",
          prompt:
            "You are a professional marketing copywriter. Generate a compelling one-paragraph product description",
          running: false,
        },
        type: "textNode",
        position: {
          x: 1090.986952504254,
          y: 146.6842983064264,
        },
        width: 180,
        height: 210,
      },
      {
        id: "text-1777238447952",
        data: {
          label: "text",
          prompt:
            "Product: Classic Leather Crossbody Bag\n\nFeatures: Premium leather finish, adjustable shoulder strap, secure flap closure, compact yet spacious design for daily essentials.",
          running: false,
        },
        type: "textNode",
        position: {
          x: 1156.3772040690587,
          y: 828.2370982123527,
        },
        width: 180,
        height: 210,
      },
      {
        id: "llm-1777238632520",
        data: {
          error: false,
          label: "llm",
          model: "gemini-2.5-flash",
          output:
            "Elevate your everyday style with our Classic Leather Crossbody Bag, meticulously crafted from a premium leather finish that promises both durability and timeless elegance. Designed for convenience, it features an adjustable shoulder strap for personalized comfort and a secure flap closure to keep your belongings safe. Despite its compact silhouette, this bag offers a surprisingly spacious interior, perfectly accommodating all your daily essentials without compromising on sophisticated appeal.",
          prompt: "take the required description from text nodes",
          running: false,
        },
        type: "llmNode",
        position: {
          x: 1588.0249987719092,
          y: 357.27679240878246,
        },
        width: 180,
        height: 214,
      },
      {
        id: "output-llm-1777238632520",
        data: {
          label: "output",
          output:
            "Elevate your everyday style with our Classic Leather Crossbody Bag, meticulously crafted from a premium leather finish that promises both durability and timeless elegance. Designed for convenience, it features an adjustable shoulder strap for personalized comfort and a secure flap closure to keep your belongings safe. Despite its compact silhouette, this bag offers a surprisingly spacious interior, perfectly accommodating all your daily essentials without compromising on sophisticated appeal.",
          running: false,
          autoOutputFor: "llm-1777238632520",
        },
        type: "outputNode",
        position: {
          x: 1908.0249987719092,
          y: 357.27679240878246,
        },
        width: 280,
        height: 383,
      },
    ],
    edges: [
      {
        id: "reactflow__edge-image-1777238379072-crop-1777238395617",
        source: "image-1777238379072",
        target: "crop-1777238395617",
      },
      {
        id: "edge-crop-1777238395617-output-crop-1777238395617",
        source: "crop-1777238395617",
        target: "output-crop-1777238395617",
      },
      {
        id: "reactflow__edge-text-1777238420417-llm-1777238632520",
        source: "text-1777238420417",
        target: "llm-1777238632520",
      },
      {
        id: "reactflow__edge-output-crop-1777238395617-llm-1777238632520",
        source: "output-crop-1777238395617",
        target: "llm-1777238632520",
      },
      {
        id: "reactflow__edge-text-1777238447952-llm-1777238632520",
        source: "text-1777238447952",
        target: "llm-1777238632520",
      },
      {
        id: "edge-llm-1777238632520-output-llm-1777238632520",
        source: "llm-1777238632520",
        target: "output-llm-1777238632520",
      },
    ],
  },
  {
    id: "sample-workflow-2",
    name: "Sample Workflow - 2",
    description: "Extract a video frame and generate a social media post.",
    image: sampleWorkflow2Frame,
    nodes: [
      {
        id: "video-1777245513158",
        type: "videoNode",
        position: {
          x: -79.36607904296108,
          y: 128.76045888602053,
        },
        data: {
          label: "video",
          prompt: "",
          running: false,
          uploading: false,
          video: sampleWorkflow2Video,
          uploadedVideo: sampleWorkflow2Video,
          error: false,
          errorMessage: "",
          output: sampleWorkflow2Video,
        },
        width: 180,
        height: 162,
      },
      {
        id: "frame-1777245518774",
        type: "extractFrame",
        position: {
          x: 302.9253332393204,
          y: 330.37844105018286,
        },
        data: {
          label: "frame",
          prompt: "",
          time: "5",
          format: "jpg",
          image: sampleWorkflow2Frame,
          output: sampleWorkflow2Frame,
          error: false,
          running: false,
          uploadedImage: sampleWorkflow2Frame,
          model: "",
          provider: "",
        },
        width: 200,
        height: 408,
      },
      {
        id: "output-frame-1777245518774",
        type: "outputNode",
        position: {
          x: 622.9253332393205,
          y: 266.71834525674615,
        },
        data: {
          label: "output",
          autoOutputFor: "frame-1777245518774",
          running: false,
          output: sampleWorkflow2Frame,
        },
        width: 280,
        height: 202,
      },
      {
        id: "text-1777245608728",
        type: "textNode",
        position: {
          x: 696.7120779573479,
          y: -148.54217312795956,
        },
        data: {
          label: "text",
          prompt:
            "You are a social media manager. Create a tweet-length marketing post based on the product image and video frame.",
          running: false,
        },
        width: 180,
        height: 210,
      },
      {
        id: "llm-1777245643070",
        type: "llmNode",
        position: {
          x: 1057.3944650539352,
          y: 77.9349644607603,
        },
        data: {
          label: "llm",
          prompt: "do as the text node say",
          model: "gemini-2.5-flash",
          running: false,
          output: sampleWorkflow2Output,
          error: false,
        },
        width: 180,
        height: 214,
      },
      {
        id: "output-llm-1777245643070",
        type: "outputNode",
        position: {
          x: 1377.3944650539352,
          y: 77.9349644607603,
        },
        data: {
          label: "output",
          autoOutputFor: "llm-1777245643070",
          running: false,
          output: sampleWorkflow2Output,
        },
        width: 280,
        height: 201,
      },
    ],
    edges: [
      {
        id: "reactflow__edge-video-1777245513158-frame-1777245518774",
        source: "video-1777245513158",
        target: "frame-1777245518774",
        type: "beizer",
        style: {
          stroke: "#60a5fa",
          strokeWidth: 3,
        },
      },
      {
        id: "edge-frame-1777245518774-output-frame-1777245518774",
        source: "frame-1777245518774",
        target: "output-frame-1777245518774",
        type: "pulse",
      },
      {
        id: "reactflow__edge-output-frame-1777245518774-llm-1777245643070",
        source: "output-frame-1777245518774",
        target: "llm-1777245643070",
        type: "beizer",
        style: {
          stroke: "#60a5fa",
          strokeWidth: 3,
        },
      },
      {
        id: "reactflow__edge-text-1777245608728-llm-1777245643070",
        source: "text-1777245608728",
        target: "llm-1777245643070",
        type: "beizer",
        style: {
          stroke: "#60a5fa",
          strokeWidth: 3,
        },
      },
      {
        id: "edge-llm-1777245643070-output-llm-1777245643070",
        source: "llm-1777245643070",
        target: "output-llm-1777245643070",
        type: "pulse",
      },
    ],
  }
  ,
  {
    id: "merged-workflow",
    name: "Merged Workflow",
    description: "Combined product image, crop, video frame, and fast marketing post workflow.",
    image: mergedWorkflowImage,
    nodes: [
      {
        id: "image-1777238379072",
        type: "imageNode",
        position: {
          x: 196.71005725832782,
          y: 299.50854053265766,
        },
        data: {
          error: false,
          image:
            "https://hxgqkhpmksawptnwsuoi.supabase.co/storage/v1/object/public/media/workflow-image-1777238418198.jpeg",
          label: "image",
          prompt: "",
          running: false,
          uploading: false,
          uploadedImage:
            "https://hxgqkhpmksawptnwsuoi.supabase.co/storage/v1/object/public/media/workflow-image-1777238418198.jpeg",
        },
        width: 300,
        height: 302,
      },
      {
        id: "crop-1777238395617",
        type: "cropNode",
        position: {
          x: 717.6130944816886,
          y: 486.29101362116506,
        },
        data: {
          x: "50",
          y: "50",
          error: false,
          image:
            "https://hxgqkhpmksawptnwsuoi.supabase.co/storage/v1/object/public/media/workflow-processed-1777377156442-2d5d3f24.png",
          label: "crop",
          width: "80",
          height: "80",
          output:
            "https://hxgqkhpmksawptnwsuoi.supabase.co/storage/v1/object/public/media/workflow-processed-1777377156442-2d5d3f24.png",
          prompt: "",
          running: false,
          uploadedImage:
            "https://hxgqkhpmksawptnwsuoi.supabase.co/storage/v1/object/public/media/workflow-processed-1777377156442-2d5d3f24.png",
        },
        width: 200,
        height: 523,
      },
      {
        id: "text-1777238420417",
        type: "textNode",
        position: {
          x: 1090.986952504254,
          y: 146.6842983064264,
        },
        data: {
          label: "text",
          prompt:
            "You are a professional marketing copywriter. Generate a compelling one-paragraph product description",
          running: false,
        },
        width: 180,
        height: 210,
      },
      {
        id: "text-1777238447952",
        type: "textNode",
        position: {
          x: 1156.3772040690587,
          y: 828.2370982123527,
        },
        data: {
          label: "text",
          prompt:
            "Product: Classic Leather Crossbody Bag\n\nFeatures: Premium leather finish, adjustable shoulder strap, secure flap closure, compact yet spacious design for daily essentials.",
          running: false,
        },
        width: 180,
        height: 210,
      },
      {
        id: "llm-1777238632520",
        type: "llmNode",
        position: {
          x: 1588.0249987719092,
          y: 357.27679240878246,
        },
        data: {
          error: false,
          label: "llm",
          model: "gemini-2.5-flash",
          output:
            "Elevate your everyday style with our Classic Leather Crossbody Bag, a timeless accessory crafted from premium, finely textured leather in a rich caramel hue. Designed for both elegance and practicality, it features a comfortable, adjustable shoulder strap that allows for versatile wear, while the distinctive saddle-shaped flap, adorned with elegant white contrast stitching and a secure gold-tone magnetic closure, keeps your belongings safe. This bag strikes the perfect balance, offering a compact silhouette that discreetly holds all your daily essentials without compromising on sophisticated design.",
          prompt: "take the required description from text nodes",
          running: false,
        },
        width: 180,
        height: 214,
      },
      {
        id: "video-1777376162277",
        type: "videoNode",
        position: {
          x: 743.1049502981002,
          y: 1331.3602213136814,
        },
        data: {
          error: false,
          label: "video",
          video:
            "https://hxgqkhpmksawptnwsuoi.supabase.co/storage/v1/object/public/media/media-1777376276820-0.4515760288536247.mp4",
          output:
            "https://hxgqkhpmksawptnwsuoi.supabase.co/storage/v1/object/public/media/media-1777376276820-0.4515760288536247.mp4",
          prompt: "",
          running: false,
          uploading: false,
          errorMessage: "",
          uploadedVideo:
            "https://hxgqkhpmksawptnwsuoi.supabase.co/storage/v1/object/public/media/media-1777376276820-0.4515760288536247.mp4",
        },
        width: 180,
        height: 162,
      },
      {
        id: "text-1777376178660",
        type: "textNode",
        position: {
          x: 1271.803389092006,
          y: 1169.609960093363,
        },
        data: {
          label: "text",
          prompt:
            "You are a social media manager. Create a tweet-length marketing post based on the product image and video frame",
          running: false,
        },
        width: 180,
        height: 210,
      },
      {
        id: "frame-1777376539092",
        type: "extractFrame",
        position: {
          x: 1549.562637276954,
          y: 1661.9626026303722,
        },
        data: {
          time: "05",
          error: false,
          image: mergedWorkflowImage,
          label: "frame",
          model: "",
          format: "jpg",
          output: mergedWorkflowImage,
          prompt: "",
          running: false,
          provider: "",
          uploadedImage: mergedWorkflowImage,
        },
        width: 200,
        height: 408,
      },
      {
        id: "output-llm-1777238632520",
        type: "outputNode",
        position: {
          x: 1908.0249987719092,
          y: 357.27679240878246,
        },
        data: {
          label: "output",
          autoOutputFor: "llm-1777238632520",
          running: false,
          output:
            "Elevate your everyday style with our Classic Leather Crossbody Bag, a timeless accessory crafted from premium, finely textured leather in a rich caramel hue. Designed for both elegance and practicality, it features a comfortable, adjustable shoulder strap that allows for versatile wear, while the distinctive saddle-shaped flap, adorned with elegant white contrast stitching and a secure gold-tone magnetic closure, keeps your belongings safe. This bag strikes the perfect balance, offering a compact silhouette that discreetly holds all your daily essentials without compromising on sophisticated design.",
        },
        width: 280,
        height: 451,
      },
      {
        id: "llm-1777377312788",
        type: "llmNode",
        position: {
          x: 2502.1097318449492,
          y: 1119.8030401919943,
        },
        data: {
          label: "llm",
          prompt: "do as the text says",
          model: "gemini-2.5-flash",
          running: false,
          output:
            "Elevate your everyday style with our Classic Leather Crossbody Bag! Crafted from premium caramel-hued leather, its timeless design, saddle-shaped flap, and gold-tone closure offer elegant practicality. Compact yet spacious for your essentials. #LeatherBag #Crossbody #TimelessStyle",
          error: false,
        },
        width: 180,
        height: 214,
      },
      {
        id: "output-llm-1777377312788",
        type: "outputNode",
        position: {
          x: 2822.1097318449492,
          y: 1119.8030401919943,
        },
        data: {
          label: "output",
          autoOutputFor: "llm-1777377312788",
          running: false,
          output:
            "Elevate your everyday style with our Classic Leather Crossbody Bag! Crafted from premium caramel-hued leather, its timeless design, saddle-shaped flap, and gold-tone closure offer elegant practicality. Compact yet spacious for your essentials. #LeatherBag #Crossbody #TimelessStyle",
        },
        width: 280,
        height: 269,
      },
    ],
    edges: [
      {
        id: "reactflow__edge-image-1777238379072-crop-1777238395617",
        source: "image-1777238379072",
        target: "crop-1777238395617",
      },
      {
        id: "reactflow__edge-text-1777238420417-llm-1777238632520",
        source: "text-1777238420417",
        target: "llm-1777238632520",
      },
      {
        id: "reactflow__edge-text-1777238447952-llm-1777238632520",
        source: "text-1777238447952",
        target: "llm-1777238632520",
      },
      {
        id: "reactflow__edge-video-1777376162277-frame-1777376539092",
        source: "video-1777376162277",
        target: "frame-1777376539092",
      },
      {
        id: "reactflow__edge-crop-1777238395617-llm-1777238632520",
        source: "crop-1777238395617",
        target: "llm-1777238632520",
      },
      {
        id: "edge-llm-1777238632520-output-llm-1777238632520",
        source: "llm-1777238632520",
        target: "output-llm-1777238632520",
        type: "pulse",
      },
      {
        id: "reactflow__edge-text-1777376178660-llm-1777377312788",
        type: "beizer",
        style: {
          stroke: "#60a5fa",
          strokeWidth: 3,
        },
        source: "text-1777376178660",
        target: "llm-1777377312788",
      },
      {
        id: "reactflow__edge-frame-1777376539092-llm-1777377312788",
        type: "beizer",
        style: {
          stroke: "#60a5fa",
          strokeWidth: 3,
        },
        source: "frame-1777376539092",
        target: "llm-1777377312788",
      },
      {
        id: "reactflow__edge-output-llm-1777238632520-llm-1777377312788",
        type: "beizer",
        style: {
          stroke: "#60a5fa",
          strokeWidth: 3,
        },
        source: "output-llm-1777238632520",
        target: "llm-1777377312788",
      },
      {
        id: "edge-llm-1777377312788-output-llm-1777377312788",
        source: "llm-1777377312788",
        target: "output-llm-1777377312788",
        type: "pulse",
      },
    ],
  },
];
