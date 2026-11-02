"""Service d'analyse MASO (FastAPI).

Lancement : uvicorn app.main:app --reload --port 8000
Chaque réponse est un ensemble de faits et d'indices ; aucun verdict n'est jamais calculé.
"""

import shutil

import httpx
from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import __version__
from .config import settings
from .factcheck import search_claims
from .image import ai_clue, read_provenance
from .link import analyse_link, normalize_url, request_archive
from .netguard import UnsafeUrlError, check_url, new_client
from .ratelimit import RateLimiter
from .sniff import sniff_mime
from .video import analyse_video

app = FastAPI(title="MASO — service d'analyse", version=__version__)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
limiter = RateLimiter(settings.requests_per_minute)


def rate_limited(request: Request) -> None:
    client = request.client.host if request.client else "inconnu"
    if not limiter.allow(client):
        raise HTTPException(status_code=429, detail="rate_limited")


def http_client():
    with new_client() as client:
        yield client


async def read_upload(upload: UploadFile, max_bytes: int, kind: str) -> tuple[bytes, str]:
    """Lit le fichier en refusant les tailles excessives et les types qui ne correspondent pas au contenu."""
    chunks, size = [], 0
    while chunk := await upload.read(1024 * 1024):
        size += len(chunk)
        if size > max_bytes:
            raise HTTPException(status_code=413, detail="file_too_large")
        chunks.append(chunk)
    data = b"".join(chunks)
    mime = sniff_mime(data[:32])
    if not mime or not mime.startswith(f"{kind}/"):
        raise HTTPException(status_code=415, detail="unsupported_file_type")
    return data, mime


class LinkRequest(BaseModel):
    url: str


@app.get("/health")
def health() -> dict:
    try:
        import c2pa  # noqa: F401

        c2pa_ready = True
    except ImportError:
        c2pa_ready = False
    return {
        "status": "ok",
        "version": __version__,
        "capabilities": {
            "provenance": c2pa_ready,
            "ai_clue": bool(settings.hf_token),
            "factcheck": bool(settings.factcheck_api_key),
            "video": True,
            "link": True,
            "ffmpeg_cli": shutil.which("ffmpeg") is not None,
        },
    }


@app.post("/image/provenance", dependencies=[Depends(rate_limited)])
async def image_provenance(file: UploadFile = File(...)) -> dict:
    data, mime = await read_upload(file, settings.max_image_bytes, "image")
    return read_provenance(data, mime)


@app.post("/image/ai-clue", dependencies=[Depends(rate_limited)])
async def image_ai_clue(file: UploadFile = File(...), client: httpx.Client = Depends(http_client)) -> dict:
    data, _ = await read_upload(file, settings.max_image_bytes, "image")
    try:
        return ai_clue(client, settings.hf_token, settings.ai_model, data)
    except httpx.HTTPError:
        return {"available": False, "model": settings.ai_model, "error": "model_unreachable"}


@app.post("/video/analyse", dependencies=[Depends(rate_limited)])
async def video_analyse(file: UploadFile = File(...)) -> dict:
    data, _ = await read_upload(file, settings.max_video_bytes, "video")
    try:
        return analyse_video(data)
    except (ValueError, OSError) as error:
        raise HTTPException(status_code=422, detail="unreadable_video") from error


@app.post("/link/analyse", dependencies=[Depends(rate_limited)])
def link_analyse(body: LinkRequest, client: httpx.Client = Depends(http_client)) -> dict:
    try:
        return analyse_link(client, body.url)
    except UnsafeUrlError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/link/archive", dependencies=[Depends(rate_limited)])
def link_archive(body: LinkRequest) -> dict:
    try:
        url = normalize_url(body.url)
        check_url(url)
    except UnsafeUrlError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    with new_client(timeout=90) as client:
        try:
            return {"tool": "Wayback Machine", **request_archive(client, url)}
        except httpx.HTTPError:
            return {"tool": "Wayback Machine", "archived": False, "error": "archive_unreachable"}


@app.get("/factcheck", dependencies=[Depends(rate_limited)])
def factcheck(
    query: str = Query(min_length=3, max_length=300),
    language: str | None = Query(default=None, pattern="^(fr|mg|en)$"),
    client: httpx.Client = Depends(http_client),
) -> dict:
    try:
        return search_claims(client, settings.factcheck_api_key, query, language)
    except httpx.HTTPError:
        return {"available": False, "claims": [], "error": "factcheck_unreachable"}
