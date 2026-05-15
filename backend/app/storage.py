import json
from pathlib import Path
from typing import Any


DATA_FILE = Path(__file__).resolve().parents[1] / "data" / "flows.json"


def _read_all() -> dict[str, Any]:
    if not DATA_FILE.exists():
        return {}

    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def list_flows() -> list[dict[str, Any]]:
    return list(_read_all().values())


def get_flow(flow_id: str) -> dict[str, Any] | None:
    return _read_all().get(flow_id)


def save_flow(flow: dict[str, Any]) -> dict[str, Any]:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    data = _read_all()
    data[flow["id"]] = flow

    with DATA_FILE.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)

    return flow

