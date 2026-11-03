import httpx
import pytest

from app import page
from app.factcheck import search_image
from app.netguard import UnsafeUrlError

ARTICLE = """<html><head>
<title>Ignoré si og:title</title>
<meta property="og:title" content="Inondations : la photo date de 2024">
<meta property="og:description" content="Une photo virale ressort.">
<meta property="og:image" content="/images/photo.jpg">
<meta property="og:site_name" content="Actu Démo">
<meta property="article:published_time" content="2024-03-12T08:00:00Z">
<link rel="canonical" href="https://actu.exemple.mg/inondations">
</head><body>…</body></html>"""


@pytest.fixture(autouse=True)
def public_hosts(monkeypatch):
    monkeypatch.setattr(page, "check_url", lambda url: "public")


def client_for(handler) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_lit_titre_description_image_et_date():
    html = lambda r: httpx.Response(200, html=ARTICLE)  # noqa: E731
    with client_for(html) as client:
        result = page.read_page(client, "https://actu.exemple.mg/inondations")
    assert result["available"] and not result["blocked"] and result["social"] is None
    assert result["title"] == "Inondations : la photo date de 2024"
    assert result["image"] == "https://actu.exemple.mg/images/photo.jpg"
    assert result["published_at"].startswith("2024-03-12")
    assert result["site_name"] == "Actu Démo"


def test_suit_les_redirections_en_les_revalidant(monkeypatch):
    seen = []
    monkeypatch.setattr(page, "check_url", lambda url: seen.append(url) or "public")

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/court":
            return httpx.Response(301, headers={"location": "https://actu.exemple.mg/inondations"})
        return httpx.Response(200, html=ARTICLE)

    with client_for(handler) as client:
        result = page.read_page(client, "https://actu.exemple.mg/court")
    assert result["final_url"] == "https://actu.exemple.mg/inondations"
    assert seen == ["https://actu.exemple.mg/court", "https://actu.exemple.mg/inondations"]


def test_redirection_vers_un_reseau_interne_refusee(monkeypatch):
    def check(url):
        if "169.254" in url:
            raise UnsafeUrlError("private_address")
        return "public"

    monkeypatch.setattr(page, "check_url", check)
    redirect = lambda r: httpx.Response(302, headers={"location": "http://169.254.169.254/"})  # noqa: E731
    with client_for(redirect) as client, pytest.raises(UnsafeUrlError):
        page.read_page(client, "https://piege.exemple.mg/")


def test_facebook_derriere_la_connexion_est_signale_bloque():
    def handler(request: httpx.Request) -> httpx.Response:
        if "login" in request.url.path:
            return httpx.Response(200, html="<title>Facebook</title>")
        return httpx.Response(302, headers={"location": "https://www.facebook.com/login/?next=x"})

    with client_for(handler) as client:
        result = page.read_page(client, "https://www.facebook.com/share/p/abc/")
    assert result["social"] == "facebook" and result["blocked"] is True


def test_page_de_connexion_facebook_reconnue():
    html = '<title>Connectez-vous ou inscrivez-vous pour voir le contenu</title><meta property="og:image" content="https://static.xx.fbcdn.net/logo.png">'
    with client_for(lambda r: httpx.Response(200, html=html)) as client:
        assert page.read_page(client, "https://www.facebook.com/share/p/abc/")["blocked"] is True


def test_publication_facebook_publique_lisible():
    html = '<meta property="og:description" content="Texte du post"><meta property="og:image" content="https://scontent.xx.fbcdn.net/v/p.jpg">'
    with client_for(lambda r: httpx.Response(200, html=html)) as client:
        result = page.read_page(client, "https://m.facebook.com/story.php?id=1")
    assert result["social"] == "facebook" and result["blocked"] is False
    assert result["image"].startswith("https://scontent")


def test_taille_de_media_bornee():
    big = lambda r: httpx.Response(200, content=b"\xff\xd8\xff" + b"0" * (page.MAX_MEDIA_BYTES["image"] + 1))  # noqa: E731
    with client_for(big) as client, pytest.raises(page.MediaTooLarge):
        page.fetch_media(client, "https://cdn.exemple.mg/photo.jpg", "image")


def test_recherche_de_verifications_par_image():
    body = {"results": [{"claim": {"text": "Photo d'inondation", "claimReview": [{"publisher": {"name": "AFP Factuel"}, "url": "https://factuel.afp.com/x", "textualRating": "Faux"}]}}]}
    with client_for(lambda r: httpx.Response(200, json=body)) as client:
        result = search_image(client, "cle", "https://cdn.exemple.mg/photo.jpg")
    assert result["claims"] == [
        {"text": "Photo d'inondation", "claimant": None, "publisher": "AFP Factuel", "url": "https://factuel.afp.com/x", "rating": "Faux", "date": None, "language": None}
    ]
    assert search_image(client, "", "https://x")["available"] is False


def test_points_d_entree(monkeypatch, jpeg_bytes):
    from fastapi.testclient import TestClient

    from app import main

    monkeypatch.setattr(main, "check_url", lambda url: "public")
    monkeypatch.setattr(main, "fetch_media", lambda client, url, kind: (jpeg_bytes, "image/jpeg"))
    api = TestClient(main.app)
    response = api.post("/media/fetch", json={"url": "https://cdn.exemple.mg/photo.jpg"})
    assert response.status_code == 200 and response.headers["content-type"] == "image/jpeg"
    monkeypatch.setattr(main, "fetch_media", lambda client, url, kind: (b"<html>pas une image</html>", "text/html"))
    assert api.post("/media/fetch", json={"url": "https://cdn.exemple.mg/page"}).status_code == 415


def test_adresse_interne_refusee():
    from fastapi.testclient import TestClient

    from app import main

    api = TestClient(main.app)
    for path in ("/link/page", "/media/fetch"):
        response = api.post(path, json={"url": "http://127.0.0.1/admin"})
        assert response.status_code == 422 and response.json()["detail"] == "private_address"


def test_detecteur_ia_sightengine():
    from app.image import ai_clue_sightengine

    ok = lambda r: httpx.Response(200, json={"status": "success", "type": {"ai_generated": 0.97}})  # noqa: E731
    with client_for(ok) as client:
        assert ai_clue_sightengine(client, "u", "s", b"\xff\xd8\xff") == {"available": True, "model": "sightengine:genai", "score": 0.97}
    quota = lambda r: httpx.Response(200, json={"status": "failure", "error": {"type": "usage_limit", "message": "Daily usage limit reached"}})  # noqa: E731
    with client_for(quota) as client:
        assert ai_clue_sightengine(client, "u", "s", b"x")["error"] == "quota_exceeded"
    bad = lambda r: httpx.Response(401, json={"status": "failure", "error": {"type": "credentials_error", "message": "Incorrect API user or secret"}})  # noqa: E731
    with client_for(bad) as client:
        assert ai_clue_sightengine(client, "u", "s", b"x")["error"] == "token_not_allowed"


def test_detecteur_ia_quota_hugging_face():
    from app.image import ai_clue

    with client_for(lambda r: httpx.Response(402, json={"error": "You have no remaining credits."})) as client:
        assert ai_clue(client, "hf_x", "modele", b"x")["error"] == "quota_exceeded"
