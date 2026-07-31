import re


def build_image_name(prefix: str, index: int, extension: str = "png") -> str:
    safe_prefix = sanitize_name(prefix)
    safe_extension = sanitize_extension(extension)
    return f"{safe_prefix}_image_{index:03d}.{safe_extension}"


def sanitize_name(value: str) -> str:
    cleaned = value.strip().lower()
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "_", cleaned)
    cleaned = cleaned.strip("._-")
    return cleaned or "image"


def sanitize_extension(extension: str) -> str:
    cleaned = extension.strip().lower().replace(".", "")

    if cleaned in {"jpeg", "jpg", "png", "gif", "bmp", "tiff", "webp"}:
        return cleaned

    return "png"
