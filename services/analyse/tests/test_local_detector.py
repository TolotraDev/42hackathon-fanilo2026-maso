import io

import numpy as np
import onnx
import pytest
from onnx import TensorProto, helper, numpy_helper
from PIL import Image

from app import local_detector


def tiny_model(path):
    """Modèle de test au même format que le vrai (entrée 1×3×224×224, sortie 2 logits : artificial, human).
    Une image très rouge sort « artificial », une image bleue « human »."""
    weights = numpy_helper.from_array(np.array([[6.0, -6.0], [0.0, 0.0], [-6.0, 6.0]], dtype=np.float32), "W")
    graph = helper.make_graph(
        [
            helper.make_node("GlobalAveragePool", ["pixel_values"], ["pooled"]),
            helper.make_node("Flatten", ["pooled"], ["flat"]),
            helper.make_node("MatMul", ["flat", "W"], ["logits"]),
        ],
        "detecteur_test",
        [helper.make_tensor_value_info("pixel_values", TensorProto.FLOAT, [1, 3, 224, 224])],
        [helper.make_tensor_value_info("logits", TensorProto.FLOAT, [1, 2])],
        [weights],
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
    model.ir_version = 9
    onnx.save(model, path)


def jpeg(color) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (640, 480), color).save(buffer, format="JPEG")
    return buffer.getvalue()


@pytest.fixture
def model_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(local_detector, "MODEL_DIR", tmp_path)
    monkeypatch.setattr(local_detector, "MODEL_FILE", tmp_path / "model.int8.onnx")
    monkeypatch.setattr(local_detector, "_session", None)
    return tmp_path


def test_sans_modele_prepare_indique_l_absence(model_dir):
    assert local_detector.ai_clue_local(jpeg((200, 30, 30))) == {"available": False, "model": local_detector.MODEL_NAME, "error": "model_not_prepared"}


def test_preparation_compression_et_score(model_dir):
    tiny_model(model_dir / "model.fp32.onnx")  # déjà « téléchargé » : prepare() le compresse
    local_detector.prepare()
    assert local_detector.is_ready() and not (model_dir / "model.fp32.onnx").exists()
    red = local_detector.ai_clue_local(jpeg((230, 20, 20)))
    blue = local_detector.ai_clue_local(jpeg((20, 20, 230)))
    assert red["available"] and red["model"].endswith("(local)")
    assert red["score"] > 0.9 and blue["score"] < 0.1


def test_pretraitement_au_format_du_modele():
    pixels = local_detector.preprocess(jpeg((255, 255, 255)))
    assert pixels.shape == (1, 3, 224, 224) and pixels.dtype == np.float32
    assert pixels[0, 0, 0, 0] == pytest.approx((1 - 0.485) / 0.229, abs=0.05)


def test_le_service_utilise_le_modele_local_sans_cle(monkeypatch, jpeg_bytes):
    from fastapi.testclient import TestClient

    from app import main

    from dataclasses import replace

    monkeypatch.setattr(main, "settings", replace(main.settings, sightengine_user="", sightengine_secret="", hf_token=""))
    monkeypatch.setattr(main.local_detector, "is_ready", lambda: True)
    monkeypatch.setattr(main.local_detector, "ai_clue_local", lambda data: {"available": True, "model": "local", "score": 0.42})
    response = TestClient(main.app).post("/image/ai-clue", files={"file": ("p.jpg", jpeg_bytes, "image/jpeg")})
    assert response.json() == {"available": True, "model": "local", "score": 0.42}


def test_delai_depasse_sans_bloquer_le_service(model_dir, monkeypatch):
    tiny_model(model_dir / "model.fp32.onnx")
    local_detector.prepare()

    class Killed:
        """Processus qui ne répond plus."""
        stdin = __import__("io").BytesIO()
        stdout = None

        def poll(self):
            return None

        def wait(self):
            return -9

    monkeypatch.setattr(local_detector, "_start_worker", lambda: Killed())
    monkeypatch.setattr(local_detector.select, "select", lambda *args: ([], [], []))
    monkeypatch.setattr(local_detector, "_worker", None)
    monkeypatch.setattr(local_detector, "_stop_worker", lambda: None)
    assert local_detector.ai_clue_local(jpeg((230, 20, 20)))["error"] == "model_timeout"


def test_le_processus_garde_le_modele_entre_deux_images(model_dir):
    tiny_model(model_dir / "model.fp32.onnx")
    local_detector.prepare()
    try:
        first = local_detector.ai_clue_local(jpeg((230, 20, 20)))
        worker = local_detector._worker
        second = local_detector.ai_clue_local(jpeg((20, 20, 230)))
        assert local_detector._worker is worker and worker.poll() is None
        assert first["score"] > 0.9 and second["score"] < 0.1
        # Image illisible : réponse d'erreur, le processus reste en vie.
        assert local_detector.ai_clue_local(b"pas une image")["error"] == "unreadable_image"
        assert worker.poll() is None
        # Processus tué (manque de mémoire) : signalé, puis relancé à l'image suivante.
        worker.kill()
        worker.wait()
        assert local_detector.ai_clue_local(jpeg((230, 20, 20)))["available"] is True
    finally:
        local_detector._stop_worker()
