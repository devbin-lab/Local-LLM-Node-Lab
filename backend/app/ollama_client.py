import json
from urllib import error, request


OLLAMA_BASE_URL = "http://127.0.0.1:11434"


class OllamaUnavailable(RuntimeError):
    pass


def list_models() -> list[str]:
    try:
        with request.urlopen(f"{OLLAMA_BASE_URL}/api/tags", timeout=3) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise OllamaUnavailable("Ollama server is not reachable.") from exc

    return [model["name"] for model in payload.get("models", [])]


def generate(model: str, prompt: str, system_prompt: str = "", temperature: float = 0.2) -> str:
    body = {
        "model": model,
        "prompt": prompt,
        "system": system_prompt,
        "stream": False,
        "options": {"temperature": temperature},
    }

    encoded = json.dumps(body).encode("utf-8")
    req = request.Request(
        f"{OLLAMA_BASE_URL}/api/generate",
        data=encoded,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=120) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise OllamaUnavailable("Ollama generation request failed.") from exc

    return payload.get("response", "")

