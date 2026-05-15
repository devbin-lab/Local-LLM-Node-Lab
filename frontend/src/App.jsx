import { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

import CustomNode from "./CustomNode";
import { defaultEdges, defaultNodes } from "./defaultFlow";

const nodeTypes = { custom: CustomNode };
const translations = {
  en: {
    subtitle: "Compact research build for local prompt workflow experiments",
    savedFlows: "Saved flows",
    save: "Save",
    reset: "Reset",
    run: "Run",
    nodes: "Nodes",
    prompt: "Prompt",
    localLlm: "Local LLM",
    validator: "Validator",
    viewer: "Viewer",
    inspector: "Inspector",
    selectNode: "Select a node.",
    model: "Model",
    selectModel: "Select model",
    systemPrompt: "System prompt",
    temperature: "Temperature",
    viewerHint: "Displays the final upstream output.",
    validatorHint: "Checks requirement fit and logical issues.",
    selectedEdge: "Selected edge",
    deleteEdge: "Delete edge",
    runLog: "Run Log",
    noRunYet: "No run yet.",
    noOutput: "No output",
    finalOutput: "Final Output",
    runHint: "Run the flow to see output.",
    flowSaved: "Flow saved.",
    flowLoaded: "Flow loaded.",
    flowRestored: "Default flow restored.",
  },
  ko: {
    subtitle: "로컬 프롬프트 워크플로우 실험용 축소 연구 버전",
    savedFlows: "저장된 플로우",
    save: "저장",
    reset: "초기화",
    run: "실행",
    nodes: "노드",
    prompt: "프롬프트",
    localLlm: "로컬 LLM",
    validator: "검증",
    viewer: "결과 보기",
    inspector: "속성",
    selectNode: "노드를 선택하세요.",
    model: "모델",
    selectModel: "모델 선택",
    systemPrompt: "시스템 프롬프트",
    temperature: "온도",
    viewerHint: "마지막 입력 결과를 표시합니다.",
    validatorHint: "요구 충족 여부와 논리적 문제를 검토합니다.",
    selectedEdge: "선택된 선",
    deleteEdge: "선 삭제",
    runLog: "실행 로그",
    noRunYet: "아직 실행하지 않았습니다.",
    noOutput: "출력 없음",
    finalOutput: "최종 출력",
    runHint: "플로우를 실행하면 결과가 표시됩니다.",
    flowSaved: "플로우를 저장했습니다.",
    flowLoaded: "플로우를 불러왔습니다.",
    flowRestored: "기본 플로우로 되돌렸습니다.",
  },
  ja: {
    subtitle: "ローカルプロンプトワークフロー実験用の小型研究版",
    savedFlows: "保存済みフロー",
    save: "保存",
    reset: "リセット",
    run: "実行",
    nodes: "ノード",
    prompt: "プロンプト",
    localLlm: "ローカル LLM",
    validator: "検証",
    viewer: "ビューア",
    inspector: "インスペクタ",
    selectNode: "ノードを選択してください。",
    model: "モデル",
    selectModel: "モデルを選択",
    systemPrompt: "システムプロンプト",
    temperature: "温度",
    viewerHint: "最後の入力結果を表示します。",
    validatorHint: "要件適合性と論理的な問題を確認します。",
    selectedEdge: "選択中の線",
    deleteEdge: "線を削除",
    runLog: "実行ログ",
    noRunYet: "まだ実行されていません。",
    noOutput: "出力なし",
    finalOutput: "最終出力",
    runHint: "フローを実行すると結果が表示されます。",
    flowSaved: "フローを保存しました。",
    flowLoaded: "フローを読み込みました。",
    flowRestored: "既定のフローに戻しました。",
  },
};

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [selectedNodeId, setSelectedNodeId] = useState("prompt-1");
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [models, setModels] = useState([]);
  const [savedFlows, setSavedFlows] = useState([]);
  const [flowId, setFlowId] = useState(null);
  const [flowName, setFlowName] = useState("Research demo");
  const [language, setLanguage] = useState("en");
  const [runState, setRunState] = useState({ status: "idle", steps: [], finalOutput: "" });
  const [message, setMessage] = useState("");

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );
  const t = translations[language];

  const localizeNodes = (sourceNodes, fallbackModel = "") =>
    sourceNodes.map((node) => {
      const nodeType = node.data.nodeType;
      const labels = {
        prompt: t.prompt,
        llm: t.localLlm,
        validator: t.validator,
        viewer: t.viewer,
      };

      return {
        ...node,
        data: {
          ...node.data,
          label: labels[nodeType] ?? node.data.label,
          ...(["llm", "validator"].includes(nodeType) && !node.data.model
            ? { model: fallbackModel }
            : {}),
        },
      };
    });

  useEffect(() => {
    request("/api/models")
      .then((data) => {
        setModels(data.models);
        if (data.models.length > 0) {
          setNodes((current) =>
            current.map((node) =>
              ["llm", "validator"].includes(node.data.nodeType) && !node.data.model
                ? { ...node, data: { ...node.data, model: data.models[0] } }
                : node,
            ),
          );
        }
      })
      .catch(() => setModels([]));
  }, [setNodes]);

  useEffect(() => {
    setNodes((current) => localizeNodes(current, models[0] ?? ""));
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    request("/api/flows")
      .then(setSavedFlows)
      .catch(() => setSavedFlows([]));
  }, []);

  const updateSelectedNode = (patch) => {
    if (!selectedNode) return;
    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNode.id ? { ...node, data: { ...node.data, ...patch } } : node,
      ),
    );
  };

  const onConnect = (connection) => setEdges((current) => addEdge(connection, current));
  const deleteEdge = (edgeId) => {
    setEdges((current) => current.filter((edge) => edge.id !== edgeId));
    setSelectedEdgeId(null);
  };

  const addNode = (nodeType) => {
    const sequence = nodes.length + 1;
    const base = {
      id: `${nodeType}-${Date.now()}`,
      type: "custom",
      position: { x: 120 + sequence * 40, y: 80 + sequence * 30 },
    };

    const dataByType = {
      prompt: { label: t.prompt, nodeType: "prompt", prompt: "" },
      llm: {
        label: t.localLlm,
        nodeType: "llm",
        model: models[0] ?? "",
        systemPrompt: "",
        temperature: 0.2,
      },
      validator: {
        label: t.validator,
        nodeType: "validator",
        model: models[0] ?? "",
        temperature: 0.1,
      },
      viewer: { label: t.viewer, nodeType: "viewer" },
    };

    const newNode = { ...base, data: dataByType[nodeType] };
    setNodes((current) => [...current, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const resetFlow = () => {
    setNodes(localizeNodes(defaultNodes, models[0] ?? ""));
    setEdges(defaultEdges);
    setFlowId(null);
    setFlowName("Research demo");
    setSelectedNodeId("prompt-1");
    setRunState({ status: "idle", steps: [], finalOutput: "" });
    setMessage(t.flowRestored);
  };

  const saveFlow = async () => {
    const saved = await request("/api/flows", {
      method: "POST",
      body: JSON.stringify({ id: flowId, name: flowName, nodes, edges }),
    });
    setFlowId(saved.id);
    setSavedFlows((current) => {
      const others = current.filter((flow) => flow.id !== saved.id);
      return [...others, saved];
    });
    setMessage(t.flowSaved);
  };

  const loadFlow = async (id) => {
    if (!id) return;
    const saved = await request(`/api/flows/${id}`);
    setFlowId(saved.id);
    setFlowName(saved.name);
    setNodes(saved.nodes);
    setEdges(saved.edges);
    setSelectedNodeId(saved.nodes[0]?.id ?? null);
    setRunState({ status: "idle", steps: [], finalOutput: "" });
    setMessage(t.flowLoaded);
  };

  const runFlow = async () => {
    setRunState({ status: "running", steps: [], finalOutput: "" });
    setMessage("");

    try {
      const result = await request("/api/run", {
        method: "POST",
        body: JSON.stringify({ flow: { id: flowId, name: flowName, nodes, edges }, language }),
      });
      setRunState({
        status: result.status,
        steps: result.steps,
        finalOutput: result.final_output,
      });
    } catch (error) {
      setRunState({ status: "error", steps: [], finalOutput: "" });
      setMessage(error.message);
    }
  };

  return (
    <div className="app-shell">
      <header className="toolbar">
        <div>
          <h1>Local LLM Node Lab</h1>
          <p>{t.subtitle}</p>
        </div>
        <div className="toolbar-actions">
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="ko">한국어</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
          <select value={flowId ?? ""} onChange={(event) => loadFlow(event.target.value)}>
            <option value="">{t.savedFlows}</option>
            {savedFlows.map((flow) => (
              <option key={flow.id} value={flow.id}>
                {flow.name}
              </option>
            ))}
          </select>
          <input value={flowName} onChange={(event) => setFlowName(event.target.value)} />
          <button onClick={saveFlow}>{t.save}</button>
          <button onClick={resetFlow}>{t.reset}</button>
          <button className="primary" onClick={runFlow}>
            {t.run}
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="sidebar">
          <section>
            <h2>{t.nodes}</h2>
            <button onClick={() => addNode("prompt")}>+ {t.prompt}</button>
            <button onClick={() => addNode("llm")}>+ {t.localLlm}</button>
            <button onClick={() => addNode("validator")}>+ {t.validator}</button>
            <button onClick={() => addNode("viewer")}>+ {t.viewer}</button>
          </section>

          <section>
            <h2>{t.inspector}</h2>
            {!selectedNode && <p>{t.selectNode}</p>}
            {selectedNode?.data.nodeType === "prompt" && (
              <label>
                {t.prompt}
                <textarea
                  value={selectedNode.data.prompt}
                  onChange={(event) => updateSelectedNode({ prompt: event.target.value })}
                />
              </label>
            )}
            {["llm", "validator"].includes(selectedNode?.data.nodeType) && (
              <>
                <label>
                  {t.model}
                  <select
                    value={selectedNode.data.model}
                    onChange={(event) => updateSelectedNode({ model: event.target.value })}
                  >
                    <option value="">{t.selectModel}</option>
                    {models.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedNode?.data.nodeType === "llm" && (
                  <label>
                    {t.systemPrompt}
                    <textarea
                      value={selectedNode.data.systemPrompt}
                      onChange={(event) => updateSelectedNode({ systemPrompt: event.target.value })}
                    />
                  </label>
                )}
                <label>
                  {t.temperature}
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={selectedNode.data.temperature}
                    onChange={(event) =>
                      updateSelectedNode({ temperature: Number(event.target.value) })
                    }
                  />
                </label>
              </>
            )}
            {selectedNode?.data.nodeType === "validator" && <p>{t.validatorHint}</p>}
            {selectedNode?.data.nodeType === "viewer" && <p>{t.viewerHint}</p>}
            {selectedEdgeId && (
              <div className="edge-actions">
                <p>{t.selectedEdge}</p>
                <button onClick={() => deleteEdge(selectedEdgeId)}>{t.deleteEdge}</button>
              </div>
            )}
          </section>
        </aside>

        <section className="canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeId(null);
            }}
            onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}
            onEdgeDoubleClick={(_, edge) => deleteEdge(edge.id)}
            deleteKeyCode={["Backspace", "Delete"]}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </section>

        <aside className="results">
          <h2>{t.runLog}</h2>
          {message && <p className="message">{message}</p>}
          {runState.steps.length === 0 && <p>{t.noRunYet}</p>}
          {runState.steps.map((step) => (
            <article key={step.node_id} className={`step ${step.status}`}>
              <strong>{step.label}</strong>
              <span>{step.node_type}</span>
              {step.error ? <p>{step.error}</p> : <p>{step.output || t.noOutput}</p>}
            </article>
          ))}
          <h2>{t.finalOutput}</h2>
          <pre>{runState.finalOutput || t.runHint}</pre>
        </aside>
      </main>
    </div>
  );
}
