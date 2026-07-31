from pathlib import Path

import pdfplumber
import pymupdf

from doc_to_md.assets.naming import build_image_name
from doc_to_md.core.models import (
    ContentBlock,
    DocumentSection,
    ExtractedImage,
    ParsedDocument,
)
from doc_to_md.parsers.base_parser import BaseParser


class PdfParser(BaseParser):
    def parse(self, file_path: Path, image_dir: Path) -> ParsedDocument:
        warnings = [
            "PDF heading detection uses heuristic rules and requires manual review.",
            "Scanned PDFs are not supported in this MVP because OCR is not enabled.",
            "Complex PDF tables, merged cells, and multi-column layout may require manual review.",
        ]

        parsed = ParsedDocument(
            source_file=file_path.name,
            source_path=file_path,
            source_type="pdf",
            title=file_path.stem,
            sections=[],
            images=[],
            warnings=warnings,
            metadata={},
        )

        parsed.sections = self._extract_text_and_tables(file_path)
        parsed.images = self._extract_images(file_path, image_dir)

        if parsed.images:
            image_section = DocumentSection(
                heading="Extracted Images",
                level=1,
                blocks=[],
            )

            for image in parsed.images:
                image_section.blocks.append(
                    ContentBlock(
                        type="image",
                        content={
                            "alt": image.alt_text,
                            "path": image.relative_path,
                        },
                    )
                )

            parsed.sections.append(image_section)

        if not parsed.sections:
            parsed.warnings.append(
                "No text or tables were extracted. This may be a scanned or image-only PDF."
            )

        return parsed

    def _extract_text_and_tables(self, file_path: Path):
        sections = []

        with pdfplumber.open(str(file_path)) as pdf:
            for page_index, page in enumerate(pdf.pages, start=1):
                section = DocumentSection(
                    heading=f"Page {page_index}",
                    level=1,
                    blocks=[],
                )

                text = page.extract_text(layout=True) or ""
                lines = [
                    line.rstrip()
                    for line in text.splitlines()
                    if line.strip()
                ]

                for line in lines:
                    clean_line = line.strip()

                    if self._looks_like_heading(clean_line):
                        section.blocks.append(
                            ContentBlock(
                                type="heading",
                                content=clean_line,
                                level=2,
                            )
                        )
                    else:
                        section.blocks.append(
                            ContentBlock(
                                type="paragraph",
                                content=clean_line,
                            )
                        )

                try:
                    tables = page.extract_tables() or []

                    for table_index, table in enumerate(tables, start=1):
                        clean_rows = self._clean_table(table)

                        if clean_rows:
                            section.blocks.append(
                                ContentBlock(
                                    type="heading",
                                    content=f"Table {page_index}.{table_index}",
                                    level=2,
                                )
                            )
                            section.blocks.append(
                                ContentBlock(
                                    type="table",
                                    content=clean_rows,
                                )
                            )

                except Exception as exc:
                    section.blocks.append(
                        ContentBlock(
                            type="warning",
                            content=f"Failed to extract table on page {page_index}: {exc}",
                        )
                    )

                sections.append(section)

        return sections

    def _extract_images(self, file_path: Path, image_dir: Path):
        images = []
        document = pymupdf.open(str(file_path))

        try:
            for page_index in range(len(document)):
                page = document[page_index]
                image_list = page.get_images(full=True)

                for image_index, image_info in enumerate(image_list, start=1):
                    xref = image_info[0]
                    base_image = document.extract_image(xref)

                    image_bytes = base_image.get("image")
                    extension = base_image.get("ext", "png")

                    if not image_bytes:
                        continue

                    filename = build_image_name(
                        prefix=f"page_{page_index + 1:03d}",
                        index=image_index,
                        extension=extension,
                    )

                    output_path = image_dir / filename
                    output_path.write_bytes(image_bytes)

                    images.append(
                        ExtractedImage(
                            filename=filename,
                            relative_path=f"./images/{filename}",
                            alt_text=f"PDF page {page_index + 1} image {image_index}",
                        )
                    )

        finally:
            document.close()

        return images

    def _looks_like_heading(self, line: str) -> bool:
        stripped = line.strip()

        if not stripped:
            return False

        if len(stripped) > 120:
            return False

        if stripped.isupper() and len(stripped.split()) <= 12:
            return True

        heading_prefixes = (
            "chapter ",
            "section ",
            "part ",
            "appendix ",
        )

        if stripped.lower().startswith(heading_prefixes):
            return True

        first_token = stripped.split(" ")[0]

        if first_token.replace(".", "").isdigit() and len(stripped.split()) <= 14:
            return True

        return False

    def _clean_table(self, table):
        rows = []

        for row in table:
            clean_row = []

            for cell in row:
                value = "" if cell is None else str(cell).strip()
                value = " ".join(value.split())
                clean_row.append(value)

            if any(clean_row):
                rows.append(clean_row)

        return rows