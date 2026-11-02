from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_etat_du_service():
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["capabilities"]["provenance"] is True


def test_refuse_un_fichier_deguise_en_image():
    response = client.post("/image/provenance", files={"file": ("photo.jpg", b"<html>pas une image</html>", "image/jpeg")})
    assert response.status_code == 415


def test_provenance_absente_sur_une_image_ordinaire(jpeg_bytes):
    body = client.post("/image/provenance", files={"file": ("photo.jpg", jpeg_bytes, "image/jpeg")}).json()
    assert body["available"] is True and body["present"] is False


def test_indice_ia_desactive_sans_jeton(jpeg_bytes):
    body = client.post("/image/ai-clue", files={"file": ("photo.jpg", jpeg_bytes, "image/jpeg")}).json()
    assert body["available"] is False


def test_video(mp4_bytes):
    body = client.post("/video/analyse", files={"file": ("clip.mp4", mp4_bytes, "video/mp4")}).json()
    assert body["info"]["codec"] == "mpeg4"


def test_une_image_n_est_pas_une_video(jpeg_bytes):
    assert client.post("/video/analyse", files={"file": ("clip.mp4", jpeg_bytes, "video/mp4")}).status_code == 415


def test_lien_interne_refuse():
    response = client.post("/link/analyse", json={"url": "http://127.0.0.1:8000/health"})
    assert response.status_code == 422


def test_factcheck_sans_cle():
    body = client.get("/factcheck", params={"query": "inondation Antananarivo"}).json()
    assert body["available"] is False
