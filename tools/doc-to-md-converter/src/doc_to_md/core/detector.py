from pathlib import Path

from doc_to_md.config import SUPPORTED_EXTENSIONS


class UnsupportedFileTypeError(ValueError):
    pass


def detect_file_type(file_path: Path) -> str:
    extension = file_path.suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        supported = ", ".join(sorted(SUPPORTED_EXTENSIONS.keys()))
        raise UnsupportedFileTypeError(
            f"Unsupported file type '{extension}'. Supported: {supported}"
        )

    return SUPPORTED_EXTENSIONS[extension]
