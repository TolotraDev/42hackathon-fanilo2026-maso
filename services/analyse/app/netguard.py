"""Accès réseau sortant sécurisé : le service ne visite jamais une adresse interne (protection SSRF)."""

import ipaddress
import socket
from urllib.parse import urljoin, urlsplit

import httpx

USER_AGENT = "MASO-analyse/0.1 (+verification journalistique)"
MAX_REDIRECTS = 5


class UnsafeUrlError(ValueError):
    """Adresse refusée : schéma non web, hôte invalide ou réseau privé."""


def is_public_ip(address: str) -> bool:
    ip = ipaddress.ip_address(address)
    return ip.is_global and not ip.is_multicast


def resolve_public(host: str) -> list[str]:
    """Résout l'hôte et refuse s'il pointe, même en partie, vers une adresse non publique."""
    try:
        infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    except socket.gaierror as error:
        raise UnsafeUrlError("host_not_found") from error
    addresses = sorted({info[4][0] for info in infos})
    if not addresses or not all(is_public_ip(address) for address in addresses):
        raise UnsafeUrlError("private_address")
    return addresses


def check_url(url: str) -> str:
    """Valide une adresse web publique et renvoie son nom d'hôte."""
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https"):
        raise UnsafeUrlError("unsupported_scheme")
    if not parts.hostname or parts.username or parts.password:
        raise UnsafeUrlError("invalid_host")
    if parts.port not in (None, 80, 443):
        raise UnsafeUrlError("unsupported_port")
    resolve_public(parts.hostname)
    return parts.hostname


def safe_get(client: httpx.Client, url: str, **kwargs) -> httpx.Response:
    """GET en suivant les redirections une par une, chaque étape étant revalidée."""
    current = url
    for _ in range(MAX_REDIRECTS + 1):
        check_url(current)
        response = client.get(current, follow_redirects=False, **kwargs)
        if response.is_redirect and "location" in response.headers:
            current = urljoin(current, response.headers["location"])
            continue
        return response
    raise UnsafeUrlError("too_many_redirects")


def new_client(timeout: float = 10.0) -> httpx.Client:
    return httpx.Client(timeout=timeout, headers={"User-Agent": USER_AGENT})
