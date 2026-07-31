from doc_to_md.core.models import ContentBlock, ParsedDocument
from doc_to_md.markdown.frontmatter import build_frontmatter
from doc_to_md.markdown.sanitizer import markdown_heading
from doc_to_md.markdown.tables import rows_to_markdown_table


class MarkdownBuilder:
    def build(self, document: ParsedDocument) -> str:
        parts: list[str] = []

        parts.append(build_frontmatter(document.source_file))
        parts.append(markdown_heading(document.title, 1))
        parts.append("")

        for section in document.sections:
            parts.append(markdown_heading(section.heading, section.level))
            parts.append("")

            for block in section.blocks:
                rendered = self._render_block(block)
                if rendered:
                    parts.append(rendered)
                    parts.append("")

        if document.warnings:
            parts.append("---")
            parts.append("")
            parts.append("## Conversion Notes")
            parts.append("")

            for warning in document.warnings:
                parts.append(f"- {warning}")

            parts.append("")

        return "\n".join(parts).rstrip() + "\n"

    def _render_block(self, block: ContentBlock) -> str:
        if block.type == "paragraph":
            return str(block.content).strip()

        if block.type == "heading":
            level = block.level if block.level is not None else 2
            return markdown_heading(str(block.content), level)

        if block.type == "bullet_list":
            return self._render_bullet_list(block.content)

        if block.type == "numbered_list":
            return self._render_numbered_list(block.content)

        if block.type == "table":
            return rows_to_markdown_table(block.content)

        if block.type == "image":
            alt = block.content.get("alt", "image")
            path = block.content.get("path", "")
            return f"![{alt}]({path})"

        if block.type == "blockquote":
            return self._render_blockquote(str(block.content))

        if block.type == "warning":
            return f"> Warning: {block.content}"

        return ""

    def _render_bullet_list(self, items: list[str]) -> str:
        lines: list[str] = []

        for item in items:
            raw = str(item).rstrip()
            stripped = raw.lstrip()
            indent_len = len(raw) - len(stripped)
            indent = " " * indent_len
            lines.append(f"{indent}- {stripped}")

        return "\n".join(lines)

    def _render_numbered_list(self, items: list[str]) -> str:
        lines: list[str] = []

        for index, item in enumerate(items, start=1):
            lines.append(f"{index}. {str(item).strip()}")

        return "\n".join(lines)

    def _render_blockquote(self, text: str) -> str:
        lines = text.splitlines()
        return "\n".join(f"> {line}" if line.strip() else ">" for line in lines)