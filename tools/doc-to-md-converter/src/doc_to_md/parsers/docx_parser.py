from pathlib import Path
from zipfile import ZipFile

from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph

from doc_to_md.assets.naming import build_image_name
from doc_to_md.core.models import ContentBlock, DocumentSection, ExtractedImage, ParsedDocument
from doc_to_md.parsers.base_parser import BaseParser


class DocxParser(BaseParser):
    def parse(self, file_path: Path, image_dir: Path) -> ParsedDocument:
        document = Document(str(file_path))

        parsed = ParsedDocument(
            source_file=file_path.name,
            source_path=file_path,
            source_type="docx",
            title=file_path.stem,
            sections=[],
            images=[],
            warnings=[
                "DOCX text boxes, floating objects, headers, footers, and embedded objects may require manual review.",
                "DOCX images are extracted from the document media package and appended to Markdown references.",
            ],
            metadata={},
        )

        current_section = DocumentSection(
            heading=file_path.stem,
            level=1,
            blocks=[],
        )

        for block in self._iter_block_items(document):
            if isinstance(block, Paragraph):
                text = block.text.strip()

                if not text:
                    continue

                style_name = block.style.name if block.style else ""

                if style_name.lower().startswith("heading"):
                    if current_section.blocks:
                        parsed.sections.append(current_section)

                    level = self._heading_level(style_name)
                    current_section = DocumentSection(
                        heading=text,
                        level=level,
                        blocks=[],
                    )

                elif "list bullet" in style_name.lower():
                    current_section.blocks.append(
                        ContentBlock(
                            type="bullet_list",
                            content=[text],
                        )
                    )

                elif "list number" in style_name.lower():
                    current_section.blocks.append(
                        ContentBlock(
                            type="numbered_list",
                            content=[text],
                        )
                    )

                else:
                    current_section.blocks.append(
                        ContentBlock(
                            type="paragraph",
                            content=text,
                        )
                    )

            elif isinstance(block, Table):
                rows = self._table_to_rows(block)

                if rows:
                    current_section.blocks.append(
                        ContentBlock(
                            type="table",
                            content=rows,
                        )
                    )

        if current_section.blocks or not parsed.sections:
            parsed.sections.append(current_section)

        parsed.images = self._extract_images_from_package(
            file_path=file_path,
            image_dir=image_dir,
        )

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

        return parsed

    def _iter_block_items(self, document):
        body = document.element.body

        for child in body.iterchildren():
            if child.tag.endswith("}p"):
                yield Paragraph(child, document)
            elif child.tag.endswith("}tbl"):
                yield Table(child, document)

    def _heading_level(self, style_name: str) -> int:
        parts = style_name.split()

        for part in reversed(parts):
            if part.isdigit():
                return max(1, min(int(part), 6))

        return 1

    def _table_to_rows(self, table: Table) -> list[list[str]]:
        rows: list[list[str]] = []

        for row in table.rows:
            values: list[str] = []

            for cell in row.cells:
                value = " ".join(cell.text.strip().split())
                values.append(value)

            rows.append(values)

        return rows

    def _extract_images_from_package(
        self,
        file_path: Path,
        image_dir: Path,
    ) -> list[ExtractedImage]:
        extracted: list[ExtractedImage] = []

        with ZipFile(file_path, "r") as archive:
            media_files = [
                name
                for name in archive.namelist()
                if name.startswith("word/media/")
            ]

            for index, media_name in enumerate(media_files, start=1):
                extension = media_name.rsplit(".", 1)[-1].lower()

                filename = build_image_name(
                    prefix="docx",
                    index=index,
                    extension=extension,
                )

                output_path = image_dir / filename
                output_path.write_bytes(archive.read(media_name))

                extracted.append(
                    ExtractedImage(
                        filename=filename,
                        relative_path=f"./images/{filename}",
                        alt_text=f"DOCX image {index}",
                    )
                )

        return extracted
