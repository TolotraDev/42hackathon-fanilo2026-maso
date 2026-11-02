"""Type réel d'un fichier d'après ses premiers octets (on ne fait pas confiance à l'extension)."""

SIGNATURES: list[tuple[bytes, int, str]] = [
    (b"\xff\xd8\xff", 0, "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", 0, "image/png"),
    (b"GIF87a", 0, "image/gif"),
    (b"GIF89a", 0, "image/gif"),
    (b"WEBP", 8, "image/webp"),
    (b"\x1aE\xdf\xa3", 0, "video/webm"),
]

FTYP_BRANDS = {
    b"heic": "image/heic",
    b"heix": "image/heic",
    b"mif1": "image/heif",
    b"avif": "image/avif",
    b"qt  ": "video/quicktime",
}


def sniff_mime(head: bytes) -> str | None:
    for signature, offset, mime in SIGNATURES:
        if head[offset : offset + len(signature)] == signature:
            if mime == "image/webp" and head[:4] != b"RIFF":
                continue
            return mime
    if head[4:8] == b"ftyp":
        return FTYP_BRANDS.get(head[8:12], "video/mp4")
    return None
