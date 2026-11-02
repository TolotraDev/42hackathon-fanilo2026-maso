from app.sniff import sniff_mime


def test_reconnait_le_type_reel(jpeg_bytes, mp4_bytes):
    assert sniff_mime(jpeg_bytes[:32]) == "image/jpeg"
    assert sniff_mime(mp4_bytes[:32]) == "video/mp4"
    assert sniff_mime(b"\x89PNG\r\n\x1a\n" + b"\x00" * 24) == "image/png"


def test_refuse_un_faux_fichier_image():
    assert sniff_mime(b"<html><script>alert(1)</script>") is None
