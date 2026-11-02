"""Vérifications déjà publiées (Google Fact Check Tools). Désactivé proprement sans clé API."""

import httpx

ENDPOINT = "https://factchecktools.googleapis.com/v1alpha1/claims:search"


def search_claims(client: httpx.Client, api_key: str, query: str, language: str | None = None) -> dict:
    if not api_key:
        return {"available": False, "claims": []}
    params = {"query": query, "pageSize": 10, "key": api_key}
    if language:
        params["languageCode"] = language
    response = client.get(ENDPOINT, params=params)
    response.raise_for_status()
    claims = []
    for claim in response.json().get("claims", []):
        for review in claim.get("claimReview", []):
            claims.append(
                {
                    "text": claim.get("text"),
                    "claimant": claim.get("claimant"),
                    "publisher": (review.get("publisher") or {}).get("name"),
                    "url": review.get("url"),
                    "rating": review.get("textualRating"),
                    "date": review.get("reviewDate"),
                    "language": review.get("languageCode"),
                }
            )
    return {"available": True, "claims": claims, "tool": "Google Fact Check Tools"}
