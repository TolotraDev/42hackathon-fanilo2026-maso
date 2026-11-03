"""Détecteur d'images générées par IA exécuté dans le service, sans API externe ni crédit.

Modèle : Organika/sdxl-detector (Swin, licence CC BY-NC 3.0, usage non commercial), au format ONNX,
compressé en 8 bits (environ 4 fois plus petit) pour tenir dans un petit serveur.
Préparation, une seule fois (téléchargement gratuit depuis Hugging Face, sans compte) :
    python -m app.local_detector prepare
Comme les autres outils, il donne un indice, jamais une conclusion.
"""

import io
import json
import os
import subprocess
import sys
import threading
from pathlib import Path

import httpx

REPO = os.getenv("AI_LOCAL_MODEL", "Organika/sdxl-detector")
MODEL_DIR = Path(os.getenv("AI_MODEL_DIR", Path(__file__).resolve().parents[1] / "models" / "sdxl-detector"))
MODEL_FILE = Path(os.getenv("AI_MODEL_FILE", MODEL_DIR / "model.int8.onnx"))
SOURCE_URL = f"https://huggingface.co/{REPO}/resolve/main/onnx/model.onnx"
MODEL_NAME = f"{REPO} (local)"

# Réglages du modèle (preprocessor_config.json) : 224 × 224, normalisation ImageNet ; étiquette 0 = « artificial ».
SIZE = 224
MEAN = (0.485, 0.456, 0.406)
STD = (0.229, 0.224, 0.225)
ARTIFICIAL_INDEX = 0

# Délai maximal d'une analyse (chargement du modèle compris) dans le processus séparé.
TIMEOUT_S = float(os.getenv("AI_LOCAL_TIMEOUT", "90"))
SERVICE_DIR = Path(__file__).resolve().parents[1]

_session = None
_lock = threading.Lock()
# Une seule analyse à la fois : deux modèles chargés en même temps doubleraient la mémoire.
_one_at_a_time = threading.Semaphore(1)


def is_ready() -> bool:
    return MODEL_FILE.is_file()


def prepare() -> Path:
    """Télécharge le modèle ONNX et le compresse en 8 bits (quantification dynamique)."""
    from onnxruntime.quantization import QuantType, quantize_dynamic

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    source = MODEL_DIR / "model.fp32.onnx"
    if not source.is_file():
        print(f"Téléchargement de {SOURCE_URL} …", flush=True)
        with httpx.stream("GET", SOURCE_URL, follow_redirects=True, timeout=600) as response:
            response.raise_for_status()
            with source.open("wb") as output:
                for chunk in response.iter_bytes(1024 * 1024):
                    output.write(chunk)
    print("Compression en 8 bits …", flush=True)
    quantize_dynamic(str(source), str(MODEL_FILE), weight_type=QuantType.QUInt8)
    source.unlink()
    print(f"Modèle prêt : {MODEL_FILE} ({MODEL_FILE.stat().st_size / 1e6:.0f} Mo)", flush=True)
    return MODEL_FILE


def _load():
    global _session
    with _lock:
        if _session is None:
            import onnxruntime

            options = onnxruntime.SessionOptions()
            options.intra_op_num_threads = 1
            options.inter_op_num_threads = 1
            # Économie de mémoire (petit serveur de 512 Mo) : pas de réserve mémoire ni de plan préalloué.
            options.enable_cpu_mem_arena = False
            options.enable_mem_pattern = False
            options.graph_optimization_level = onnxruntime.GraphOptimizationLevel.ORT_ENABLE_BASIC
            _session = onnxruntime.InferenceSession(str(MODEL_FILE), options, providers=["CPUExecutionProvider"])
    return _session


def preprocess(data: bytes):
    import numpy as np
    from PIL import Image

    image = Image.open(io.BytesIO(data)).convert("RGB").resize((SIZE, SIZE), Image.Resampling.BICUBIC)
    pixels = np.asarray(image, dtype=np.float32) / 255.0
    pixels = (pixels - np.array(MEAN, dtype=np.float32)) / np.array(STD, dtype=np.float32)
    return pixels.transpose(2, 0, 1)[np.newaxis, ...].astype(np.float32)


def score(data: bytes) -> dict:
    """Probabilité « image générée » selon le modèle, calculée dans le processus courant."""
    import numpy as np

    session = _load()
    logits = session.run(None, {session.get_inputs()[0].name: preprocess(data)})[0][0]
    exp = np.exp(logits - logits.max())
    probabilities = exp / exp.sum()
    return {"available": True, "model": MODEL_NAME, "score": round(float(probabilities[ARTIFICIAL_INDEX]), 3)}


def ai_clue_local(data: bytes) -> dict:
    """Indice IA calculé dans un processus séparé : si le serveur manque de mémoire, seul ce processus
    s'arrête et le service continue de répondre (les autres analyses restent disponibles)."""
    if not is_ready():
        return {"available": False, "model": MODEL_NAME, "error": "model_not_prepared"}
    env = {**os.environ, "AI_MODEL_FILE": str(MODEL_FILE)}
    with _one_at_a_time:
        try:
            done = subprocess.run(
                [sys.executable, "-m", "app.local_detector", "score"],
                input=data, capture_output=True, timeout=TIMEOUT_S, cwd=SERVICE_DIR, env=env, check=False,
            )
        except subprocess.TimeoutExpired:
            return {"available": False, "model": MODEL_NAME, "error": "model_timeout"}
    if done.returncode != 0:
        # -9 (SIGKILL) : arrêté par le système, presque toujours faute de mémoire.
        error = "model_out_of_memory" if done.returncode in (-9, 137) else "model_failed"
        print(f"Détecteur IA local : échec ({done.returncode}) {done.stderr.decode(errors='replace')[-500:]}", file=sys.stderr, flush=True)
        return {"available": False, "model": MODEL_NAME, "error": error}
    try:
        return json.loads(done.stdout.decode().strip().splitlines()[-1])
    except (ValueError, IndexError):
        return {"available": False, "model": MODEL_NAME, "error": "model_failed"}


if __name__ == "__main__":
    if sys.argv[1:] == ["prepare"]:
        prepare()
    elif sys.argv[1:] == ["score"]:
        # Appelé par ai_clue_local : l'image arrive sur l'entrée standard, le résultat sort en JSON.
        print(json.dumps(score(sys.stdin.buffer.read())), flush=True)
    else:
        print("Usage : python -m app.local_detector prepare | score < image.jpg")
        sys.exit(1)
