"""Analyse vidéo (FFmpeg via PyAV) : informations techniques et images clés analysables une à une."""

import base64
import io

import av
from PIL import Image

MAX_FRAMES = 12
FRAME_WIDTH = 640
SCENE_THRESHOLD = 32.0  # écart moyen de luminosité (0-255) qui signale un changement de plan


def _thumbnail(frame: av.VideoFrame) -> Image.Image:
    image = frame.to_image()
    if image.width > FRAME_WIDTH:
        image = image.resize((FRAME_WIDTH, round(image.height * FRAME_WIDTH / image.width)))
    return image


def _signature(image: Image.Image) -> list[int]:
    return list(image.convert("L").resize((16, 16)).tobytes())


def _encode(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.convert("RGB").save(buffer, format="JPEG", quality=85)
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def analyse_video(data: bytes) -> dict:
    with av.open(io.BytesIO(data)) as container:
        stream = next((s for s in container.streams if s.type == "video"), None)
        if stream is None:
            raise ValueError("no_video_stream")
        duration = float(container.duration / av.time_base) if container.duration else (
            float(stream.duration * stream.time_base) if stream.duration else None
        )
        fps = float(stream.average_rate) if stream.average_rate else None
        info = {
            "duration_s": round(duration, 2) if duration else None,
            "codec": stream.codec_context.name,
            "width": stream.codec_context.width,
            "height": stream.codec_context.height,
            "fps": round(fps, 2) if fps else None,
            "bitrate": container.bit_rate,
            "format": container.format.name,
            "audio": any(s.type == "audio" for s in container.streams),
        }
        interval = max((duration or 8) / 8, 1.0)
        frames: list[dict] = []
        last_kept_at = -interval
        previous = None
        for frame in container.decode(stream):
            if frame.time is None:
                continue
            image = _thumbnail(frame)
            signature = _signature(image)
            change = (
                sum(abs(a - b) for a, b in zip(signature, previous)) / len(signature) if previous else 0.0
            )
            previous = signature
            reason = None
            if change >= SCENE_THRESHOLD and frame.time - last_kept_at >= 0.5:
                reason = "scene_change"  # prioritaire : plus parlant qu'un simple intervalle
            elif frame.time - last_kept_at >= interval:
                reason = "interval"
            if reason:
                frames.append({"time_s": round(frame.time, 2), "reason": reason, "jpeg_base64": _encode(image)})
                last_kept_at = frame.time
            if len(frames) >= MAX_FRAMES:
                break
    return {"info": info, "keyframes": frames, "tool": f"FFmpeg (PyAV {av.__version__})"}
