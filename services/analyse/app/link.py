"""Analyse d'un lien (M5) : âge du domaine, HTTPS, hébergeur, archives existantes.

Chaque résultat est un fait vérifiable (source citée) ; l'interface le présente comme un indice.
"""

from datetime import datetime, timezone
from urllib.parse import quote, urlsplit

import httpx

from .netguard import UnsafeUrlError, check_url, resolve_public, safe_get

RDAP_DOMAIN = "https://rdap.org/domain/{}"
RDAP_IP = "https://rdap.org/ip/{}"
WAYBACK_AVAILABLE = "https://archive.org/wayback/available?url={}"
WAYBACK_SAVE = "https://web.archive.org/save/{}"


def normalize_url(raw: str) -> str:
    value = raw.strip()
    if "://" not in value:
        value = "https://" + value
    parts = urlsplit(value)
    if not parts.hostname:
        raise UnsafeUrlError("invalid_host")
    return value


def candidate_domains(hostname: str) -> list[str]:
    """www.actu.example.mg → [actu.example.mg, example.mg] : on remonte jusqu'au domaine enregistré."""
    labels = hostname.lower().removeprefix("www.").split(".")
    return [".".join(labels[i:]) for i in range(len(labels) - 1)]


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def parse_rdap_domain(data: dict) -> dict:
    events = {event.get("eventAction"): event.get("eventDate") for event in data.get("events", [])}
    created = _parse_date(events.get("registration"))
    registrar = None
    for entity in data.get("entities", []):
        if "registrar" in entity.get("roles", []):
            vcard = entity.get("vcardArray", [None, []])[1]
            registrar = next((item[3] for item in vcard if item and item[0] == "fn"), None)
    age_days = (datetime.now(timezone.utc) - created).days if created else None
    return {
        "domain": data.get("ldhName", "").lower() or None,
        "created_at": created.isoformat() if created else None,
        "age_days": age_days,
        "registrar": registrar,
    }


def lookup_domain(client: httpx.Client, hostname: str) -> dict:
    for domain in candidate_domains(hostname):
        response = client.get(RDAP_DOMAIN.format(domain), follow_redirects=True)
        if response.status_code == 200:
            return {"available": True, **parse_rdap_domain(response.json())}
    return {"available": False, "domain": candidate_domains(hostname)[-1] if "." in hostname else hostname}


def lookup_hosting(client: httpx.Client, hostname: str) -> dict:
    addresses = resolve_public(hostname)
    ip = addresses[0]
    response = client.get(RDAP_IP.format(ip), follow_redirects=True)
    if response.status_code != 200:
        return {"available": False, "ip": ip}
    data = response.json()
    organization = None
    for entity in data.get("entities", []):
        vcard = entity.get("vcardArray", [None, []])[1]
        organization = next((item[3] for item in vcard if item and item[0] == "fn"), None) or organization
        if organization:
            break
    return {
        "available": True,
        "ip": ip,
        "network": data.get("name"),
        "organization": organization,
        "country": data.get("country"),
    }


def check_https(client: httpx.Client, url: str) -> dict:
    hostname = urlsplit(url).hostname
    https_url = f"https://{hostname}/"
    try:
        response = safe_get(client, https_url)
        return {"https": True, "status": response.status_code}
    except httpx.HTTPError:
        return {"https": False, "status": None}


def latest_archive(client: httpx.Client, url: str) -> dict:
    response = client.get(WAYBACK_AVAILABLE.format(quote(url, safe="")))
    # Une erreur (ex. 429 : trop de requêtes) ne signifie pas « jamais archivée » : on la signale comme échec.
    response.raise_for_status()
    snapshot = response.json().get("archived_snapshots", {}).get("closest")
    if not snapshot:
        return {"archived": False}
    return {"archived": True, "archive_url": snapshot.get("url"), "timestamp": snapshot.get("timestamp")}


def request_archive(client: httpx.Client, url: str) -> dict:
    """Demande à la Wayback Machine d'archiver la page maintenant (peut prendre jusqu'à une minute)."""
    response = client.get(WAYBACK_SAVE.format(url), follow_redirects=False)
    location = response.headers.get("content-location") or response.headers.get("location")
    if location:
        return {"archived": True, "archive_url": location if location.startswith("http") else f"https://web.archive.org{location}"}
    return {"archived": False, "status": response.status_code}


def analyse_link(client: httpx.Client, raw_url: str) -> dict:
    url = normalize_url(raw_url)
    hostname = check_url(url)

    def attempt(step):
        try:
            return {"ok": True, **step()}
        except UnsafeUrlError:
            raise
        except (httpx.HTTPError, ValueError) as error:
            return {"ok": False, "error": type(error).__name__}

    return {
        "url": url,
        "hostname": hostname,
        "https": attempt(lambda: check_https(client, url)),
        "domain": attempt(lambda: lookup_domain(client, hostname)),
        "hosting": attempt(lambda: lookup_hosting(client, hostname)),
        "archive": attempt(lambda: latest_archive(client, url)),
        "tools": {"domain": "RDAP (rdap.org)", "hosting": "RDAP IP (rdap.org)", "archive": "Wayback Machine"},
    }
