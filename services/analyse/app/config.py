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


def _origins(items: list[str]) -> list[str]:
    """Adresses de site tolérantes aux erreurs de saisie courantes : guillemets, « / » final, majuscules."""
    return [item.strip("'\" ").rstrip("/").lower() for item in items]


@dataclass(frozen=True)
class Settings:
    allowed_origins: list[str] = field(
        default_factory=lambda: _origins(_list("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:4173"))
    )
    # Adresses acceptées en plus, par motif (ex. toutes les adresses de prévisualisation Vercel du projet).
    allowed_origin_regex: str | None = os.getenv("ALLOWED_ORIGIN_REGEX") or None
    factcheck_api_key: str = os.getenv("GOOGLE_FACTCHECK_API_KEY", "")
    hf_token: str = os.getenv("HF_TOKEN", "")
    # Détecteur d'images IA : Sightengine s'il est configuré (offre gratuite), sinon Hugging Face.
    sightengine_user: str = os.getenv("SIGHTENGINE_API_USER", "")
    sightengine_secret: str = os.getenv("SIGHTENGINE_API_SECRET", "")
    # Détecteur exécuté dans le service (modèle préparé par « python -m app.local_detector prepare ») ; « off » pour le couper.
    ai_local_enabled: bool = os.getenv("AI_LOCAL_DETECTOR", "on").lower() != "off"
    ai_model: str = os.getenv("AI_IMAGE_MODEL", "umm-maybe/AI-image-detector")
    max_image_bytes: int = int(os.getenv("MAX_IMAGE_MB", "20")) * 1024 * 1024
    max_video_bytes: int = int(os.getenv("MAX_VIDEO_MB", "100")) * 1024 * 1024
    requests_per_minute: int = int(os.getenv("REQUESTS_PER_MINUTE", "60"))


settings = Settings()
