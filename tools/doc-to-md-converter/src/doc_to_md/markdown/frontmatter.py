from doc_to_md.config import MARKDOWN_STATUS
from doc_to_md.utils.dates import now_iso


def build_frontmatter(source_file: str) -> str:
    return "\n".join(
        [
            "---",
            f"source: {source_file}",
            f"converted_at: {now_iso()}",
            f"status: {MARKDOWN_STATUS}",
            "---",
            "",
        ]
    )
