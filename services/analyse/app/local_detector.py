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
import select
import struct
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


_worker: subprocess.Popen | None = None


def _start_worker() -> subprocess.Popen:
    env = {**os.environ, "AI_MODEL_FILE": str(MODEL_FILE)}
    return subprocess.Popen(
        [sys.executable, "-m", "app.local_detector", "serve"],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, cwd=SERVICE_DIR, env=env,
    )


def _stop_worker() -> None:
    global _worker
    if _worker is not None:
        _worker.kill()
        _worker.wait()
    _worker = None


def warm_up() -> None:
    """Lance le processus du détecteur dès le démarrage : le modèle est prêt avant la première image."""
    global _worker
    if not is_ready():
        return
    with _one_at_a_time:
        if _worker is None or _worker.poll() is not None:
            _worker = _start_worker()


def ai_clue_local(data: bytes) -> dict:
    """Indice IA calculé dans un processus séparé, qui garde le modèle chargé entre deux images
    (chargement ~10 s une seule fois, puis moins d'une seconde par image). Si le serveur manque de
    mémoire, seul ce processus s'arrête : le service continue de répondre et le relance à la demande."""
    global _worker
    if not is_ready():
        return {"available": False, "model": MODEL_NAME, "error": "model_not_prepared"}
    with _one_at_a_time:
        if _worker is None or _worker.poll() is not None:
            _worker = _start_worker()
        worker = _worker
        try:
            worker.stdin.write(struct.pack(">Q", len(data)) + data)
            worker.stdin.flush()
            ready, _, _ = select.select([worker.stdout], [], [], TIMEOUT_S)
            line = worker.stdout.readline() if ready else None
        except (BrokenPipeError, OSError):
            line = b""
        if line is None:
            _stop_worker()
            return {"available": False, "model": MODEL_NAME, "error": "model_timeout"}
        if not line:
            code = worker.wait()
            _worker = None
            # -9 (SIGKILL) : arrêté par le système, presque toujours faute de mémoire.
            error = "model_out_of_memory" if code in (-9, 137) else "model_failed"
            print(f"Détecteur IA local : processus arrêté ({code})", file=sys.stderr, flush=True)
            return {"available": False, "model": MODEL_NAME, "error": error}
    try:
        return json.loads(line.decode())
    except ValueError:
        return {"available": False, "model": MODEL_NAME, "error": "model_failed"}


def _serve() -> None:
    """Boucle du processus détecteur : taille (8 octets) + image sur l'entrée, une ligne JSON en sortie."""
    _load()
    source, sink = sys.stdin.buffer, sys.stdout.buffer
    while header := source.read(8):
        if len(header) < 8:
            break
        data = source.read(struct.unpack(">Q", header)[0])
        try:
            result = score(data)
        except Exception:  # image illisible : on répond, le processus reste vivant
            result = {"available": False, "model": MODEL_NAME, "error": "unreadable_image"}
        sink.write((json.dumps(result) + "\n").encode())
        sink.flush()


if __name__ == "__main__":
    if sys.argv[1:] == ["prepare"]:
        prepare()
    elif sys.argv[1:] == ["serve"]:
        _serve()
    elif sys.argv[1:] == ["score"]:
        # Appelé par ai_clue_local : l'image arrive sur l'entrée standard, le résultat sort en JSON.
        print(json.dumps(score(sys.stdin.buffer.read())), flush=True)
    else:
        print("Usage : python -m app.local_detector prepare | serve | score < image.jpg")
        sys.exit(1)
