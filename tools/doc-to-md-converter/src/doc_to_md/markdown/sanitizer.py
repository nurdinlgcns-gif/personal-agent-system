import re


def safe_stem(value: str) -> str:
    cleaned = value.strip().lower()
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "_", cleaned)
    cleaned = cleaned.strip("._-")
    return cleaned or "converted_document"


def clean_heading(value: str) -> str:
    text = " ".join(str(value).strip().split())
    return text or "Untitled"


def markdown_heading(text: str, level: int) -> str:
    safe_level = max(1, min(level, 6))
    return f"{'#' * safe_level} {clean_heading(text)}"
