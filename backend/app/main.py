from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .engine import run_flow
from .models import FlowGraph, RunRequest, RunResponse
from .ollama_client import OllamaUnavailable, list_models
from .storage import get_flow, list_flows, save_flow


app = FastAPI(title="Local LLM Node Lab")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/models")
def models() -> dict[str, list[str]]:
    try:
        return {"models": list_models()}
    except OllamaUnavailable:
        return {"models": []}


@app.get("/api/flows")
def flows() -> list[dict]:
    return list_flows()


@app.get("/api/flows/{flow_id}")
def flow_detail(flow_id: str) -> dict:
    flow = get_flow(flow_id)
    if flow is None:
        raise HTTPException(status_code=404, detail="Flow not found.")
    return flow


@app.post("/api/flows")
def upsert_flow(flow: FlowGraph) -> dict:
    payload = flow.model_dump()
    payload["id"] = payload["id"] or str(uuid4())
    return save_flow(payload)


@app.post("/api/run", response_model=RunResponse)
def run(request: RunRequest) -> RunResponse:
    return run_flow(request.flow, request.language)
