"""Vérifications déjà publiées (Google Fact Check Tools). Désactivé proprement sans clé API."""

import httpx

ENDPOINT = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
IMAGE_ENDPOINT = "https://factchecktools.googleapis.com/v1alpha1/claims:imageSearch"


def _reviews(claim: dict) -> list[dict]:
    return [
        {
            "text": claim.get("text"),
            "claimant": claim.get("claimant"),
            "publisher": (review.get("publisher") or {}).get("name"),
            "url": review.get("url"),
            "rating": review.get("textualRating"),
            "date": review.get("reviewDate"),
            "language": review.get("languageCode"),
        }
        for review in claim.get("claimReview", [])
    ]


def search_claims(client: httpx.Client, api_key: str, query: str, language: str | None = None) -> dict:
    if not api_key:
        return {"available": False, "claims": []}
    params = {"query": query, "pageSize": 10, "key": api_key}
    if language:
        params["languageCode"] = language
    response = client.get(ENDPOINT, params=params)
    response.raise_for_status()
    claims = [review for claim in response.json().get("claims", []) for review in _reviews(claim)]
    return {"available": True, "claims": claims, "tool": "Google Fact Check Tools"}


def search_image(client: httpx.Client, api_key: str, image_url: str, language: str | None = None) -> dict:
    """Vérifications publiées qui portent sur la même image (adresse publique de l'image)."""
    if not api_key:
        return {"available": False, "claims": []}
    params = {"imageUri": image_url, "pageSize": 10, "key": api_key}
    if language:
        params["languageCode"] = language
    response = client.get(IMAGE_ENDPOINT, params=params)
    response.raise_for_status()
    claims = [review for result in response.json().get("results", []) for review in _reviews(result.get("claim") or {})]
    return {"available": True, "claims": claims, "tool": "Google Fact Check Tools (image)"}
