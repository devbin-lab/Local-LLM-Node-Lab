import { Handle, Position } from "reactflow";

const nodeMeta = {
  prompt: { badge: "Input", tone: "prompt" },
  llm: { badge: "LLM", tone: "llm" },
  validator: { badge: "Check", tone: "validator" },
  viewer: { badge: "Output", tone: "viewer" },
};

export default function CustomNode({ data, selected }) {
  const meta = nodeMeta[data.nodeType] ?? { badge: "Node", tone: "neutral" };

  return (
    <div className={`graph-node ${meta.tone} ${selected ? "selected" : ""}`}>
      {data.nodeType === "validator" ? (
        <>
          <Handle id="prompt" type="target" position={Position.Left} style={{ top: 28 }} />
          <Handle id="candidate" type="target" position={Position.Left} style={{ top: 64 }} />
        </>
      ) : (
        data.nodeType !== "prompt" && <Handle type="target" position={Position.Left} />
      )}
      <div className="node-head">
        <span>{data.label}</span>
        <small>{meta.badge}</small>
      </div>
      <div className="node-copy">
        {data.nodeType === "prompt" && (data.prompt || "No prompt")}
        {data.nodeType === "llm" && (data.model || "No model selected")}
        {data.nodeType === "validator" && (data.model || "No model selected")}
        {data.nodeType === "viewer" && "Shows final output"}
      </div>
      {data.nodeType !== "viewer" && <Handle type="source" position={Position.Right} />}
    </div>
  );
}
