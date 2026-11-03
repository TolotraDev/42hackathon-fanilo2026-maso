import httpx
import pytest

from app import link

RDAP_DOMAIN = {
    "ldhName": "EXEMPLE.MG",
    "events": [{"eventAction": "registration", "eventDate": "2024-10-01T00:00:00Z"}],
    "entities": [{"roles": ["registrar"], "vcardArray": ["vcard", [["fn", {}, "text", "Registre Démo"]]]}],
}


def test_remonte_jusqu_au_domaine_enregistre():
    assert link.candidate_domains("www.actu.exemple.mg") == ["actu.exemple.mg", "exemple.mg"]


def test_lit_la_date_de_creation_rdap():
    parsed = link.parse_rdap_domain(RDAP_DOMAIN)
    assert parsed["domain"] == "exemple.mg"
    assert parsed["created_at"].startswith("2024-10-01")
    assert parsed["registrar"] == "Registre Démo"
    assert parsed["age_days"] > 0


def test_essaie_le_domaine_parent_si_le_sous_domaine_est_inconnu():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/actu.exemple.mg"):
            return httpx.Response(404)
        return httpx.Response(200, json=RDAP_DOMAIN)

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        result = link.lookup_domain(client, "actu.exemple.mg")
    assert result["available"] and result["domain"] == "exemple.mg"


def test_archive_wayback():
    snapshot = {"archived_snapshots": {"closest": {"url": "http://web.archive.org/web/2024/https://exemple.mg", "timestamp": "20240101"}}}
    with httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(200, json=snapshot))) as client:
        assert link.latest_archive(client, "https://exemple.mg")["archived"] is True


def test_une_etape_en_echec_n_empeche_pas_les_autres(monkeypatch):
    monkeypatch.setattr(link, "check_url", lambda url: "exemple.mg")
    monkeypatch.setattr(link, "resolve_public", lambda host: ["1.1.1.1"])
    monkeypatch.setattr(link, "safe_get", lambda client, url: httpx.Response(200))

    def handler(request: httpx.Request) -> httpx.Response:
        if "rdap.org/domain" in str(request.url):
            raise httpx.ConnectError("hors service")
        if "rdap.org/ip" in str(request.url):
            return httpx.Response(200, json={"name": "NET-DEMO", "country": "MG", "entities": []})
        return httpx.Response(200, json={"archived_snapshots": {}})

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        result = link.analyse_link(client, "exemple.mg/article")
    assert result["url"] == "https://exemple.mg/article"
    assert result["domain"]["ok"] is False
    assert result["hosting"]["ok"] is True and result["hosting"]["network"] == "NET-DEMO"
    assert result["https"]["https"] is True
    assert result["archive"]["archived"] is False


def test_archive_indisponible_n_est_pas_jamais_archivee(monkeypatch):
    monkeypatch.setattr(link, "check_url", lambda url: "exemple.mg")
    monkeypatch.setattr(link, "resolve_public", lambda host: ["1.1.1.1"])
    monkeypatch.setattr(link, "safe_get", lambda client, url: httpx.Response(200))

    def handler(request: httpx.Request) -> httpx.Response:
        if "archive.org" in str(request.url):
            return httpx.Response(429, text="Too Many Requests")
        return httpx.Response(404)

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        result = link.analyse_link(client, "https://exemple.mg/")
    assert result["archive"]["ok"] is False, "un refus temporaire ne doit pas devenir « jamais archivée »"
