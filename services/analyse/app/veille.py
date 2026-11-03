"""Veille (M2 / W3) : lecture des flux RSS / Atom choisis par l'administration.

Chaque adresse passe par le garde-fou réseau (pas d'adresse interne, redirections revalidées).
Le XML est lu avec defusedxml (pas d'entités externes ni d'expansion abusive).
"""

import re
from datetime import datetime
from email.utils import parsedate_to_datetime
from html import unescape

import httpx
from defusedxml import ElementTree

from .netguard import UnsafeUrlError, safe_get

MAX_FEEDS = 10
MAX_ITEMS_PER_FEED = 30
MAX_FEED_BYTES = 2 * 1024 * 1024
ATOM = "{http://www.w3.org/2005/Atom}"


def _text(node, *tags: str) -> str:
    for tag in tags:
        found = node.find(tag)
        if found is not None and (found.text or "").strip():
            return found.text.strip()
    return ""


def _clean(html: str, limit: int = 400) -> str:
    text = re.sub(r"<[^>]+>", " ", unescape(html))
    return re.sub(r"\s+", " ", text).strip()[:limit]


def _date(value: str) -> str | None:
    if not value:
        return None
    try:
        return parsedate_to_datetime(value).isoformat()
    except (TypeError, ValueError):
        pass
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).isoformat()
    except ValueError:
        return None


def parse_feed(data: bytes, feed_url: str) -> list[dict]:
    root = ElementTree.fromstring(data)
    channel_title = _text(root, "channel/title", f"{ATOM}title") or feed_url
    items = []
    for item in root.iter("item"):
        items.append(
            {
                "title": _clean(_text(item, "title"), 300),
                "link": _text(item, "link"),
                "summary": _clean(_text(item, "description")),
                "published_at": _date(_text(item, "pubDate")),
                "source": channel_title,
            }
        )
    for entry in root.iter(f"{ATOM}entry"):
        link = entry.find(f"{ATOM}link")
        items.append(
            {
                "title": _clean(_text(entry, f"{ATOM}title"), 300),
                "link": link.get("href", "") if link is not None else "",
                "summary": _clean(_text(entry, f"{ATOM}summary", f"{ATOM}content")),
                "published_at": _date(_text(entry, f"{ATOM}updated", f"{ATOM}published")),
                "source": channel_title,
            }
        )
    return [item for item in items if item["title"]][:MAX_ITEMS_PER_FEED]


def read_feeds(client: httpx.Client, urls: list[str]) -> dict:
    items, errors = [], []
    for url in urls[:MAX_FEEDS]:
        try:
            response = safe_get(client, url)
            response.raise_for_status()
            if len(response.content) > MAX_FEED_BYTES:
                raise ValueError("feed_too_large")
            items.extend(parse_feed(response.content, url))
        except (UnsafeUrlError, httpx.HTTPError, ValueError, ElementTree.ParseError) as error:
            errors.append({"url": url, "error": str(error) or error.__class__.__name__})
    items.sort(key=lambda item: item["published_at"] or "", reverse=True)
    return {"items": items, "errors": errors, "tool": "RSS / Atom"}
