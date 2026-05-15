from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Position(BaseModel):
    x: float
    y: float


class FlowNode(BaseModel):
    id: str
    type: str = "custom"
    position: Position
    data: Dict[str, Any] = Field(default_factory=dict)


class FlowEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None


class FlowGraph(BaseModel):
    id: Optional[str] = None
    name: str = "Untitled flow"
    nodes: List[FlowNode]
    edges: List[FlowEdge]


class RunRequest(BaseModel):
    flow: FlowGraph
    language: str = "en"


class RunStep(BaseModel):
    node_id: str
    node_type: str
    label: str
    status: str
    output: str = ""
    error: str = ""


class RunResponse(BaseModel):
    status: str
    steps: List[RunStep]
    final_output: str = ""
