"""Contrôle « zéro invention » : une phrase sans preuve est écartée automatiquement."""

from fastapi.testclient import TestClient

from app import main
from app.assistant import run_assistant
from app.zero_invention import Excerpt, check_output

EXCERPTS = [
    Excerpt("P1", "Photo publiée le 12 mars 2024 par l'agence BNGRC à Mahajanga, après le cyclone Gamane."),
    Excerpt("S2", "Le BNGRC est l'organe officiel de gestion des risques à Madagascar."),
    Excerpt("C3", "1 200 ménages sinistrés dans la région Boeny (BNGRC, 2024)."),
]


def test_cited_sentence_is_kept():
    result = check_output([{"text": "La photo date du 12 mars 2024.", "citations": ["P1"]}], EXCERPTS)
    assert result.compliant and len(result.kept) == 1


def test_sentence_without_citation_is_removed():
    result = check_output([{"text": "La photo a été prise hier.", "citations": []}], EXCERPTS)
    assert result.removed[0].reason == "no_citation"
    assert result.abstained


def test_unknown_excerpt_is_removed():
    result = check_output([{"text": "La photo est ancienne.", "citations": ["P9"]}], EXCERPTS)
    assert result.removed[0].reason == "unknown_excerpt"


def test_invented_number_is_removed():
    result = check_output([{"text": "On compte 5 000 ménages sinistrés.", "citations": ["C3"]}], EXCERPTS)
    assert result.removed[0].reason == "number_not_in_excerpts"


def test_number_with_spaces_matches():
    result = check_output([{"text": "On compte 1200 ménages sinistrés.", "citations": ["C3"]}], EXCERPTS)
    assert result.compliant


def test_invented_name_is_removed():
    result = check_output([{"text": "La photo vient de Toamasina.", "citations": ["P1"]}], EXCERPTS)
    assert result.removed[0].reason == "name_not_in_excerpts"
    assert "Toamasina" in result.removed[0].detail


def test_name_must_be_in_cited_excerpt_not_elsewhere():
    # « Boeny » existe dans C3, mais la phrase ne cite que P1.
    result = check_output([{"text": "La photo a été prise dans la région Boeny.", "citations": ["P1"]}], EXCERPTS)
    assert result.removed[0].reason == "name_not_in_excerpts"


def test_verdict_is_removed():
    result = check_output([{"text": "Cette information est fausse, c'est faux.", "citations": ["P1"]}], EXCERPTS)
    assert result.removed[0].reason == "verdict"


def test_citations_inside_text_are_read():
    result = check_output(["Le BNGRC a publié la photo à Mahajanga [P1]."], EXCERPTS)
    assert result.compliant and result.kept[0].citations == ["P1"]


class FakeProvider:
    name = "fake:test"

    def __init__(self, raw: str) -> None:
        self.raw = raw

    def generate(self, client, system, user):
        assert "[P1]" in user and "verdict" in system.lower()
        return self.raw


def test_assistant_keeps_only_compliant_sentences():
    raw = (
        '{"sentences": ['
        '{"text": "La photo date du 12 mars 2024 [P1].", "citations": ["P1"]},'
        '{"text": "Le gouvernement a menti.", "citations": []}'
        '], "missing": []}'
    )
    out = run_assistant(FakeProvider(raw), None, "draft", "radio", "fr", "Inondation", EXCERPTS)
    assert [s["text"] for s in out["sentences"]] == ["La photo date du 12 mars 2024 [P1]."]
    assert out["removed"][0]["reason"] == "no_citation"
    assert not out["compliant"] and not out["abstained"]
    assert out["cited_excerpts"] == ["P1"]


def test_assistant_abstains_when_nothing_is_supported():
    out = run_assistant(FakeProvider('{"sentences": [], "missing": ["date de la photo"]}'), None, "draft", "post", "mg", "", EXCERPTS)
    assert out["abstained"] and out["abstention"].startswith("Tsy ampy")
    assert out["missing"] == ["date de la photo"]


def test_assistant_survives_invalid_json():
    out = run_assistant(FakeProvider("pas du json"), None, "angles", "article", "en", "", EXCERPTS)
    assert out["abstained"] and out["abstention"] == "Insufficient information in the case file."


def test_route_is_unavailable_without_provider(monkeypatch):
    monkeypatch.setattr(main, "configured_provider", lambda: None)
    client = TestClient(main.app)
    response = client.post("/ai/assist", json={"excerpts": [{"id": "P1", "text": "x"}]})
    assert response.status_code == 503
    assert client.get("/health").json()["capabilities"]["assistant"] is False


def test_route_rejects_bad_excerpt_ids():
    response = TestClient(main.app).post("/ai/assist", json={"excerpts": [{"id": "X1", "text": "x"}]})
    assert response.status_code == 422


def test_ollama_without_server_is_not_ready(monkeypatch):
    from app import llm

    llm._READY_CACHE.clear()
    monkeypatch.setattr(llm.httpx, "get", lambda *args, **kwargs: (_ for _ in ()).throw(llm.httpx.ConnectError("refused")))
    assert llm.provider_ready(llm.OllamaProvider("http://localhost:11434", "llama3.1")) is False
    assert llm.provider_ready(llm.GroqProvider("cle", "modele")) is True
