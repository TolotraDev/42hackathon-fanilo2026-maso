"""Fournisseurs de modèles de langue, derrière une interface unique (cahier des charges, section 10).

Deux familles interchangeables : une API à offre gratuite (Groq ou Gemini) et un modèle local (Ollama).
Le choix se fait par LLM_PROVIDER (groq, gemini, ollama) ; sinon, le premier configuré est utilisé.
Sans fournisseur, l'assistant est simplement indisponible : l'application le masque.
"""

import json
import os
import time
from typing import Protocol

import httpx

# Paramètres prudents : température basse, longueur bornée.
TEMPERATURE = 0.1
MAX_TOKENS = 900


class LLMError(RuntimeError):
    pass


class LLMProvider(Protocol):
    name: str

    def generate(self, client: httpx.Client, system: str, user: str) -> str:
        """Renvoie le texte brut du modèle (attendu : du JSON)."""
        ...


class GroqProvider:
    endpoint = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(self, api_key: str, model: str) -> None:
        self.api_key, self.model = api_key, model
        self.name = f"groq:{model}"

    def generate(self, client: httpx.Client, system: str, user: str) -> str:
        response = client.post(
            self.endpoint,
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "model": self.model,
                "temperature": TEMPERATURE,
                "max_tokens": MAX_TOKENS,
                "response_format": {"type": "json_object"},
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            },
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]


class GeminiProvider:
    def __init__(self, api_key: str, model: str) -> None:
        self.api_key, self.model = api_key, model
        self.name = f"gemini:{model}"

    def generate(self, client: httpx.Client, system: str, user: str) -> str:
        response = client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent",
            headers={"x-goog-api-key": self.api_key},
            json={
                "systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"role": "user", "parts": [{"text": user}]}],
                "generationConfig": {
                    "temperature": TEMPERATURE,
                    "maxOutputTokens": MAX_TOKENS,
                    "responseMimeType": "application/json",
                },
            },
        )
        response.raise_for_status()
        return response.json()["candidates"][0]["content"]["parts"][0]["text"]


class OllamaProvider:
    def __init__(self, url: str, model: str) -> None:
        self.url, self.model = url.rstrip("/"), model
        self.name = f"ollama:{model}"

    def generate(self, client: httpx.Client, system: str, user: str) -> str:
        response = client.post(
            f"{self.url}/api/chat",
            json={
                "model": self.model,
                "stream": False,
                "format": "json",
                "options": {"temperature": TEMPERATURE, "num_predict": MAX_TOKENS},
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            },
        )
        response.raise_for_status()
        return response.json()["message"]["content"]


def configured_provider() -> LLMProvider | None:
    wanted = os.getenv("LLM_PROVIDER", "").strip().lower()
    # LLM_API_KEY (.env.example) sert de clé au fournisseur choisi par LLM_PROVIDER.
    shared_key = os.getenv("LLM_API_KEY", "")
    groq_key = os.getenv("GROQ_API_KEY", "") or (shared_key if wanted == "groq" else "")
    gemini_key = os.getenv("GEMINI_API_KEY", "") or (shared_key if wanted == "gemini" else "")
    ollama_url = os.getenv("OLLAMA_URL", "")
    available: dict[str, LLMProvider] = {}
    if groq_key:
        available["groq"] = GroqProvider(groq_key, os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"))
    if gemini_key:
        available["gemini"] = GeminiProvider(gemini_key, os.getenv("GEMINI_MODEL", "gemini-2.0-flash"))
    if ollama_url:
        available["ollama"] = OllamaProvider(ollama_url, os.getenv("OLLAMA_MODEL", "llama3.1"))
    if wanted:
        return available.get(wanted)
    return next(iter(available.values()), None)


_READY_CACHE: dict[str, tuple[float, bool]] = {}
READY_TTL_S = 30


def provider_ready(provider: LLMProvider | None) -> bool:
    """Un modèle local (Ollama) doit répondre et avoir le modèle installé ; une API à clé est supposée prête.
    Le résultat est gardé 30 s pour que /health reste rapide."""
    if provider is None:
        return False
    if not isinstance(provider, OllamaProvider):
        return True
    cached = _READY_CACHE.get(provider.name)
    if cached and time.monotonic() - cached[0] < READY_TTL_S:
        return cached[1]
    try:
        response = httpx.get(f"{provider.url}/api/tags", timeout=1.5)
        names = {model.get("name", "") for model in response.json().get("models", [])}
        ready = response.is_success and any(name == provider.model or name.startswith(f"{provider.model}:") for name in names)
    except (httpx.HTTPError, ValueError):
        ready = False
    _READY_CACHE[provider.name] = (time.monotonic(), ready)
    return ready


def parse_json(raw: str) -> dict:
    """Le modèle doit répondre en JSON ; on tolère un bloc ```json autour."""
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text[text.find("{") :]
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < start:
        raise LLMError("invalid_json")
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError as error:
        raise LLMError("invalid_json") from error
