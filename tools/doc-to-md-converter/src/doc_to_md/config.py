from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "output" / "converted"

SUPPORTED_EXTENSIONS = {
    ".pdf": "pdf",
    ".xlsx": "xlsx",
    ".pptx": "pptx",
    ".docx": "docx",
}

MARKDOWN_STATUS = "needs_review"
