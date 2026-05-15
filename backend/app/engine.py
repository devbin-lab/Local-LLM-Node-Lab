from collections import defaultdict, deque
from typing import Dict, List

from .models import FlowGraph, RunResponse, RunStep
from .ollama_client import OllamaUnavailable, generate


def _active_node_ids(flow: FlowGraph) -> set[str]:
    viewer_ids = {
        node.id
        for node in flow.nodes
        if node.data.get("nodeType") == "viewer"
    }

    if not viewer_ids:
        return {node.id for node in flow.nodes}

    reverse_edges = defaultdict(list)
    for edge in flow.edges:
        reverse_edges[edge.target].append(edge.source)

    active = set(viewer_ids)
    queue = deque(viewer_ids)
    while queue:
        node_id = queue.popleft()
        for source_id in reverse_edges[node_id]:
            if source_id not in active:
                active.add(source_id)
                queue.append(source_id)

    return active


def _topological_order(flow: FlowGraph) -> list[str]:
    node_ids = _active_node_ids(flow)
    indegree = {node_id: 0 for node_id in node_ids}
    outgoing: Dict[str, List[str]] = defaultdict(list)

    for edge in flow.edges:
        if edge.source not in node_ids or edge.target not in node_ids:
            continue
        outgoing[edge.source].append(edge.target)
        indegree[edge.target] += 1

    queue = deque(node_id for node_id, degree in indegree.items() if degree == 0)
    order = []

    while queue:
        node_id = queue.popleft()
        order.append(node_id)
        for target in outgoing[node_id]:
            indegree[target] -= 1
            if indegree[target] == 0:
                queue.append(target)

    if len(order) != len(node_ids):
        raise ValueError("Flow contains a cycle.")

    return order


VALIDATOR_LANGUAGES = {
    "ko": "Korean",
    "en": "English",
    "ja": "Japanese",
}


def _validator_prompt(source_prompt: str, candidate: str, language: str) -> str:
    response_language = VALIDATOR_LANGUAGES.get(language, "English")
    return f"""
You are a strict evaluation agent for local LLM research workflows.
Review the candidate response against the original user prompt.

Evaluate:
1. Whether the candidate satisfies the requested task.
2. Whether it contradicts the prompt or misses required constraints.
3. Whether it contains logical gaps, unsupported claims, or internal inconsistencies.
4. Whether there are concrete issues that should be revised.

Respond in {response_language}.
Use this exact structure:
- Verdict: PASS or FAIL
- Requirement fit: short assessment
- Logical review: short assessment
- Issues:
  - bullet list, or "None"
- Revision guidance: short actionable guidance

[Original prompt]
{source_prompt}

[Candidate response]
{candidate}
""".strip()


def run_flow(flow: FlowGraph, language: str = "en") -> RunResponse:
    active_ids = _active_node_ids(flow)
    nodes = {node.id: node for node in flow.nodes if node.id in active_ids}
    incoming_edges = defaultdict(list)
    for edge in flow.edges:
        if edge.source in active_ids and edge.target in active_ids:
            incoming_edges[edge.target].append(edge)

    outputs: dict[str, str] = {}
    steps: list[RunStep] = []

    try:
        order = _topological_order(flow)
    except ValueError as exc:
        return RunResponse(status="error", steps=[], final_output=str(exc))

    for node_id in order:
        node = nodes[node_id]
        node_type = node.data.get("nodeType", "")
        label = node.data.get("label", node_id)

        try:
            if node_type == "prompt":
                output = str(node.data.get("prompt", "")).strip()
                if not output:
                    raise ValueError("Prompt is empty.")

            elif node_type == "llm":
                source_values = [
                    outputs[edge.source]
                    for edge in incoming_edges[node_id]
                    if edge.source in outputs
                ]
                prompt = "\n\n".join(value for value in source_values if value).strip()
                if not prompt:
                    raise ValueError("LLM node has no upstream prompt.")

                model = str(node.data.get("model", "")).strip()
                if not model:
                    raise ValueError("Model is not selected.")

                system_prompt = str(node.data.get("systemPrompt", "")).strip()
                temperature = float(node.data.get("temperature", 0.2))
                output = generate(model=model, prompt=prompt, system_prompt=system_prompt, temperature=temperature)

            elif node_type == "validator":
                prompt_values = [
                    outputs[edge.source]
                    for edge in incoming_edges[node_id]
                    if edge.source in outputs and edge.targetHandle == "prompt"
                ]
                candidate_values = [
                    outputs[edge.source]
                    for edge in incoming_edges[node_id]
                    if edge.source in outputs and edge.targetHandle == "candidate"
                ]

                if not prompt_values:
                    raise ValueError("Validator node has no original prompt input.")
                if not candidate_values:
                    raise ValueError("Validator node has no candidate response input.")

                model = str(node.data.get("model", "")).strip()
                if not model:
                    raise ValueError("Validator model is not selected.")

                source_prompt = "\n\n".join(prompt_values).strip()
                candidate = "\n\n".join(candidate_values).strip()
                output = generate(
                    model=model,
                    prompt=_validator_prompt(source_prompt, candidate, language),
                    temperature=float(node.data.get("temperature", 0.1)),
                )

            elif node_type == "viewer":
                source_values = [
                    outputs[edge.source]
                    for edge in incoming_edges[node_id]
                    if edge.source in outputs
                ]
                output = source_values[-1] if source_values else ""

            else:
                raise ValueError(f"Unsupported node type: {node_type or 'unknown'}")

            outputs[node_id] = output
            steps.append(
                RunStep(
                    node_id=node.id,
                    node_type=node_type,
                    label=label,
                    status="success",
                    output=output,
                )
            )
        except (ValueError, OllamaUnavailable) as exc:
            steps.append(
                RunStep(
                    node_id=node.id,
                    node_type=node_type,
                    label=label,
                    status="error",
                    error=str(exc),
                )
            )
            return RunResponse(status="error", steps=steps, final_output="")

    viewer_outputs = [
        outputs[node.id]
        for node in nodes.values()
        if node.data.get("nodeType") == "viewer" and node.id in outputs
    ]
    final_output = viewer_outputs[-1] if viewer_outputs else (outputs[order[-1]] if order else "")
    return RunResponse(status="success", steps=steps, final_output=final_output)
