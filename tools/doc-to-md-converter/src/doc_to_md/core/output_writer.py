from pathlib import Path

from doc_to_md.core.models import ParsedDocument
from doc_to_md.markdown.builder import MarkdownBuilder
from doc_to_md.markdown.sanitizer import safe_stem
from doc_to_md.utils.filesystem import ensure_dir, write_text


class OutputWriter:
    def __init__(self, output_root: Path) -> None:
        self.output_root = output_root
        self.markdown_builder = MarkdownBuilder()

    def prepare_output_dirs(self, source_path: Path) -> tuple[Path, Path]:
        source_stem = safe_stem(source_path.stem)
        output_dir = self.output_root / source_stem
        image_dir = output_dir / "images"

        ensure_dir(output_dir)
        ensure_dir(image_dir)

        return output_dir, image_dir

    def write_document(self, parsed_document: ParsedDocument, output_dir: Path) -> Path:
        markdown = self.markdown_builder.build(parsed_document)
        filename = f"{safe_stem(parsed_document.source_path.stem)}.md"
        output_path = output_dir / filename

        write_text(output_path, markdown)

        return output_path
