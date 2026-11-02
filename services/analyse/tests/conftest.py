import io

import av
import pytest
from PIL import Image


@pytest.fixture
def jpeg_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (64, 48), (30, 90, 160)).save(buffer, format="JPEG")
    return buffer.getvalue()


@pytest.fixture
def mp4_bytes() -> bytes:
    """Vidéo de 4 s : 2 s de bleu nuit puis 2 s de jaune vif (un changement de plan net)."""
    buffer = io.BytesIO()
    with av.open(buffer, mode="w", format="mp4") as container:
        stream = container.add_stream("mpeg4", rate=10)
        stream.width, stream.height, stream.pix_fmt = 160, 120, "yuv420p"
        for index in range(40):
            color = (20, 30, 120) if index < 20 else (250, 230, 60)
            frame = av.VideoFrame.from_image(Image.new("RGB", (160, 120), color))
            for packet in stream.encode(frame):
                container.mux(packet)
        for packet in stream.encode():
            container.mux(packet)
    return buffer.getvalue()
