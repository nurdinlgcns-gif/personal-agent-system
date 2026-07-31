from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

BlockType = Literal[
    "paragraph",
    "heading",
    "bullet_list",
    "numbered_list",
    "table",
    "image",
    "blockquote",
    "warning",
]

SourceType = Literal["pdf", "xlsx", "pptx", "docx"]


@dataclass
class ContentBlock:
    type: BlockType
    content: Any
    level: int | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class DocumentSection:
    heading: str
    level: int = 1
    blocks: list[ContentBlock] = field(default_factory=list)


@dataclass
class ExtractedImage:
    filename: str
    relative_path: str
    alt_text: str = "extracted image"


@dataclass
class ParsedDocument:
    source_file: str
    source_path: Path
    source_type: SourceType
    title: str
    sections: list[DocumentSection] = field(default_factory=list)
    images: list[ExtractedImage] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ConversionResult:
    source_file: str
    success: bool
    output_markdown: Path | None = None
    output_dir: Path | None = None
    image_count: int = 0
    warnings: list[str] = field(default_factory=list)
    error: str | None = None
