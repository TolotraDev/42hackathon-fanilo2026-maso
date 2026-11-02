from app.video import analyse_video


def test_informations_et_images_cles(mp4_bytes):
    result = analyse_video(mp4_bytes)
    info = result["info"]
    assert info["width"] == 160 and info["height"] == 120
    assert 3.5 <= info["duration_s"] <= 4.5
    assert result["keyframes"], "au moins une image clé"
    assert any(frame["reason"] == "scene_change" for frame in result["keyframes"]), "le changement de plan est repéré"
    assert all(frame["jpeg_base64"] for frame in result["keyframes"])
