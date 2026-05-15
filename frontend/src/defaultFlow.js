export const defaultNodes = [
  {
    id: "prompt-1",
    type: "custom",
    position: { x: 40, y: 140 },
    data: {
      label: "Prompt",
      nodeType: "prompt",
      prompt: "Explain why node-based workflows are useful for prompt experiments.",
    },
  },
  {
    id: "llm-1",
    type: "custom",
    position: { x: 360, y: 140 },
    data: {
      label: "Local LLM",
      nodeType: "llm",
      model: "",
      systemPrompt: "Answer concisely for a technical audience.",
      temperature: 0.2,
    },
  },
  {
    id: "validator-1",
    type: "custom",
    position: { x: 700, y: 140 },
    data: {
      label: "Validator",
      nodeType: "validator",
      model: "",
      temperature: 0.1,
    },
  },
  {
    id: "viewer-1",
    type: "custom",
    position: { x: 1040, y: 140 },
    data: {
      label: "Viewer",
      nodeType: "viewer",
    },
  },
];

export const defaultEdges = [
  {
    id: "edge-prompt-llm",
    source: "prompt-1",
    target: "llm-1",
  },
  {
    id: "edge-prompt-validator",
    source: "prompt-1",
    target: "validator-1",
    targetHandle: "prompt",
  },
  {
    id: "edge-llm-validator",
    source: "llm-1",
    target: "validator-1",
    targetHandle: "candidate",
  },
  {
    id: "edge-validator-viewer",
    source: "validator-1",
    target: "viewer-1",
  },
];
