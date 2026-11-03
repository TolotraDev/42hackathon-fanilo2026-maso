"""Réglages lus dans les variables d'environnement (aucun secret dans le code)."""

import os
from dataclasses import dataclass, field
from pathlib import Path

# .env à la racine du projet en développement ; absent dans un conteneur (variables fournies par l'hébergeur).
_PARENTS = Path(__file__).resolve().parents
PROJECT_ENV = _PARENTS[3] / ".env" if len(_PARENTS) > 3 else Path("/nonexistent/.env")


def load_env_file(path: Path) -> None:
    """Lit le .env du projet (KEY=valeur). Une variable déjà définie au lancement reste prioritaire."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip().strip('"').strip("'")
        if value and key.strip() not in os.environ:
            os.environ[key.strip()] = value


load_env_file(PROJECT_ENV)


def _list(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    allowed_origins: list[str] = field(
        default_factory=lambda: _list("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:4173")
    )
    factcheck_api_key: str = os.getenv("GOOGLE_FACTCHECK_API_KEY", "")
    hf_token: str = os.getenv("HF_TOKEN", "")
    ai_model: str = os.getenv("AI_IMAGE_MODEL", "umm-maybe/AI-image-detector")
    max_image_bytes: int = int(os.getenv("MAX_IMAGE_MB", "20")) * 1024 * 1024
    max_video_bytes: int = int(os.getenv("MAX_VIDEO_MB", "100")) * 1024 * 1024
    requests_per_minute: int = int(os.getenv("REQUESTS_PER_MINUTE", "60"))


settings = Settings()
