"""Analyses d'image côté serveur : provenance C2PA et indice de génération par IA."""

import io
import json

import httpx

AI_SOURCE_TYPES = ("trainedAlgorithmicMedia", "compositeWithTrainedAlgorithmicMedia", "algorithmicMedia")
AI_LABEL_HINTS = ("artificial", "ai", "fake", "generated", "sd", "synthetic")


def read_provenance(data: bytes, mime: str) -> dict:
    """Content Credentials (C2PA) : créateur, outils, mention d'IA générative, validité de la signature."""
    try:
        import c2pa
    except ImportError:
        return {"available": False}
    try:
        with c2pa.Reader(mime, io.BytesIO(data)) as reader:
            store = json.loads(reader.json())
            state = reader.get_validation_state() if hasattr(reader, "get_validation_state") else None
    except Exception as error:  # le SDK lève des erreurs spécifiques selon la version
        if "ManifestNotFound" in type(error).__name__ or "not found" in str(error).lower():
            return {"available": True, "present": False, "tool": f"c2pa {c2pa.sdk_version()}"}
        return {"available": True, "present": False, "error": "unreadable", "tool": f"c2pa {c2pa.sdk_version()}"}

    manifest = store.get("manifests", {}).get(store.get("active_manifest"), {})
    actions = []
    ai_generated = False
    for assertion in manifest.get("assertions", []):
        if assertion.get("label", "").startswith("c2pa.actions"):
            for action in assertion.get("data", {}).get("actions", []):
                source = action.get("digitalSourceType", "")
                ai_generated = ai_generated or any(kind in source for kind in AI_SOURCE_TYPES)
                actions.append({"action": action.get("action"), "software": (action.get("softwareAgent") or {}).get("name") if isinstance(action.get("softwareAgent"), dict) else action.get("softwareAgent")})
    signature = manifest.get("signature_info", {})
    return {
        "available": True,
        "present": True,
        "claim_generator": manifest.get("claim_generator") or (manifest.get("claim_generator_info") or [{}])[0].get("name"),
        "issuer": signature.get("issuer"),
        "signed_at": signature.get("time"),
        "actions": actions,
        "ai_generated": ai_generated,
        "valid": state in (None, "Valid", "Trusted") and not store.get("validation_status"),
        "validation_state": state,
        "tool": f"c2pa {c2pa.sdk_version()}",
    }


def ai_clue(client: httpx.Client, token: str, model: str, data: bytes) -> dict:
    """Indice de génération par IA via un modèle spécialisé. Jamais une conclusion."""
    if not token:
        return {"available": False, "model": model}
    response = client.post(
        f"https://router.huggingface.co/hf-inference/models/{model}",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/octet-stream"},
        content=data,
        timeout=30,
    )
    if response.status_code in (401, 403):
        # Jeton refusé : il doit avoir la permission « Make calls to Inference Providers ».
        return {"available": False, "model": model, "error": "token_not_allowed"}
    if response.status_code == 402:
        # Crédits gratuits du mois épuisés sur le compte Hugging Face (renouvelés chaque mois).
        return {"available": False, "model": model, "error": "quota_exceeded"}
    response.raise_for_status()
    labels = response.json()
    score = max(
        (item.get("score", 0.0) for item in labels if any(hint in item.get("label", "").lower() for hint in AI_LABEL_HINTS)),
        default=0.0,
    )
    return {"available": True, "model": model, "score": round(float(score), 3), "labels": labels}


SIGHTENGINE_ENDPOINT = "https://api.sightengine.com/1.0/check.json"


def ai_clue_sightengine(client: httpx.Client, api_user: str, api_secret: str, data: bytes) -> dict:
    """Même indice via Sightengine (modèle « genai »), offre gratuite mensuelle. Jamais une conclusion."""
    model = "sightengine:genai"
    response = client.post(
        SIGHTENGINE_ENDPOINT,
        data={"models": "genai", "api_user": api_user, "api_secret": api_secret},
        files={"media": ("image", data)},
        timeout=30,
    )
    body = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
    if body.get("status") != "success":
        error = body.get("error") or {}
        message = f"{error.get('type', '')} {error.get('message', '')}".lower()
        if response.status_code in (401, 403) or "credential" in message or "auth" in message:
            return {"available": False, "model": model, "error": "token_not_allowed"}
        if "limit" in message or "quota" in message or response.status_code == 429:
            return {"available": False, "model": model, "error": "quota_exceeded"}
        return {"available": False, "model": model, "error": "model_unreachable"}
    score = float((body.get("type") or {}).get("ai_generated", 0.0))
    return {"available": True, "model": model, "score": round(score, 3)}
