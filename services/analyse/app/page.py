"""Lecture d'une page web : titre, description, image, date de publication (balises Open Graph).

Le service lit la page comme un navigateur ordinaire, sans identifiant. Les réseaux sociaux (Facebook,
Instagram…) cachent souvent leurs publications derrière une connexion : la page est alors signalée
« bloquée » et l'interface explique comment poursuivre (capture, image enregistrée, texte copié).
"""

from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

import httpx

from .netguard import UnsafeUrlError, check_url

MAX_PAGE_BYTES = 2 * 1024 * 1024
MAX_MEDIA_BYTES = {"image": 15 * 1024 * 1024, "video": 100 * 1024 * 1024}
MAX_REDIRECTS = 5

SOCIAL = {
    "facebook.com": "facebook",
    "fb.com": "facebook",
    "fb.watch": "facebook",
    "instagram.com": "instagram",
    "tiktok.com": "tiktok",
    "x.com": "x",
    "twitter.com": "x",
    "youtube.com": "youtube",
    "youtu.be": "youtube",
    "whatsapp.com": "whatsapp",
}

# Titres des pages de connexion des réseaux sociaux (FR, EN, MG) : le contenu n'est pas lisible.
LOGIN_TITLES = ("connectez-vous", "se connecter", "inscrivez-vous", "log in", "log into", "sign up", "login", "hiditra", "mpiditra")

DATE_KEYS = ("article:published_time", "og:published_time", "datepublished", "date", "dc.date", "pubdate", "article:modified_time", "og:updated_time")


class MediaTooLarge(ValueError):
    pass


def social_network(hostname: str) -> str | None:
    host = hostname.lower().removeprefix("www.").removeprefix("m.").removeprefix("web.")
    for domain, network in SOCIAL.items():
        if host == domain or host.endswith("." + domain):
            return network
    return None


def stream_limited(client: httpx.Client, url: str, max_bytes: int) -> tuple[bytes, str, httpx.Response]:
    """GET en flux : chaque redirection est revalidée (SSRF) et la lecture s'arrête à max_bytes."""
    current = url
    for _ in range(MAX_REDIRECTS + 1):
        check_url(current)
        with client.stream("GET", current, follow_redirects=False) as response:
            if response.is_redirect and "location" in response.headers:
                current = urljoin(current, response.headers["location"])
                continue
            chunks, size = [], 0
            for chunk in response.iter_bytes():
                size += len(chunk)
                if size > max_bytes:
                    raise MediaTooLarge("too_large")
                chunks.append(chunk)
            return b"".join(chunks), current, response
    raise UnsafeUrlError("too_many_redirects")


class _MetaParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.meta: dict[str, str] = {}
        self.title = ""
        self.canonical: str | None = None
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key.lower(): (value or "") for key, value in attrs}
        if tag == "meta":
            key = (values.get("property") or values.get("name") or values.get("itemprop") or "").lower()
            if key and values.get("content") and key not in self.meta:
                self.meta[key] = values["content"].strip()
        elif tag == "title":
            self._in_title = True
        elif tag == "link" and "canonical" in values.get("rel", "").lower() and values.get("href"):
            self.canonical = values["href"]
        elif tag == "time" and values.get("datetime") and "time" not in self.meta:
            self.meta["time"] = values["datetime"]

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._in_title and len(self.title) < 300:
            self.title += data


def parse_page(html: str, base_url: str) -> dict:
    parser = _MetaParser()
    try:
        parser.feed(html)
    except Exception:  # page mal formée : on garde ce qui a été lu
        pass
    meta = parser.meta
    absolute = lambda value: urljoin(base_url, value) if value else None  # noqa: E731
    image = meta.get("og:image") or meta.get("og:image:url") or meta.get("twitter:image") or meta.get("twitter:image:src")
    video = meta.get("og:video:secure_url") or meta.get("og:video:url") or meta.get("og:video")
    title = meta.get("og:title") or meta.get("twitter:title") or " ".join(parser.title.split())
    return {
        "title": title[:300] or None,
        "description": (meta.get("og:description") or meta.get("description") or meta.get("twitter:description") or "")[:600] or None,
        "image": absolute(image),
        "video": absolute(video),
        "site_name": meta.get("og:site_name"),
        "type": meta.get("og:type"),
        "published_at": next((meta[key] for key in DATE_KEYS if meta.get(key)), meta.get("time")),
        "author": meta.get("author") or meta.get("article:author"),
        "canonical": absolute(parser.canonical),
    }


def read_page(client: httpx.Client, url: str) -> dict:
    """Aperçu d'une page publique. Ne lève une erreur que pour une adresse refusée (réseau interne…)."""
    network = social_network(urlsplit(url).hostname or "")
    try:
        body, final_url, response = stream_limited(client, url, MAX_PAGE_BYTES)
    except MediaTooLarge:
        return {"available": False, "social": network, "blocked": False, "error": "page_too_large"}
    except httpx.HTTPError:
        return {"available": False, "social": network, "blocked": bool(network), "error": "page_unreachable"}
    content_type = response.headers.get("content-type", "")
    if "html" not in content_type:
        return {"available": False, "social": network, "blocked": False, "final_url": final_url, "content_type": content_type.split(";")[0], "error": "not_html"}
    page = parse_page(body.decode(response.encoding or "utf-8", errors="replace"), final_url)
    final_path = urlsplit(final_url).path.lower()
    # Mur de connexion : réponse refusée, redirection vers une page de connexion, ou page sans contenu propre.
    title = (page["title"] or "").lower()
    blocked = bool(network) and (
        response.status_code >= 400
        or "login" in final_path
        or "checkpoint" in final_path
        or any(word in title for word in LOGIN_TITLES)
        or not (page["description"] or page["image"])
    )
    return {"available": response.status_code < 400, "status": response.status_code, "final_url": final_url, "social": network, "blocked": blocked, **page}


def fetch_media(client: httpx.Client, url: str, kind: str) -> tuple[bytes, str]:
    """Télécharge une image ou une vidéo publique (taille bornée), pour l'analyser comme un fichier envoyé."""
    data, _, response = stream_limited(client, url, MAX_MEDIA_BYTES[kind])
    response.raise_for_status()
    return data, response.headers.get("content-type", "")
