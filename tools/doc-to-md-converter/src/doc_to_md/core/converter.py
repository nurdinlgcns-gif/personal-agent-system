from pathlib import Path

from doc_to_md.core.detector import detect_file_type
from doc_to_md.core.models import ConversionResult
from doc_to_md.core.output_writer import OutputWriter
from doc_to_md.core.router import ParserRouter
from doc_to_md.utils.filesystem import ensure_dir
from doc_to_md.utils.logger import get_logger

logger = get_logger(__name__)


class DocumentConverter:
    def __init__(self, output_root: Path) -> None:
        self.output_root = output_root
        self.router = ParserRouter()
        self.output_writer = OutputWriter(output_root=output_root)

    def convert_path(self, input_path: Path) -> list[ConversionResult]:
        input_path = input_path.resolve()
        ensure_dir(self.output_root)

        if not input_path.exists():
            raise FileNotFoundError(f"Input path does not exist: {input_path}")

        if input_path.is_file():
            return [self.convert_file(input_path)]

        if input_path.is_dir():
            results: list[ConversionResult] = []

            for file_path in sorted(input_path.iterdir()):
                if not file_path.is_file():
                    continue

                try:
                    detect_file_type(file_path)
                except Exception:
                    continue

                results.append(self.convert_file(file_path))

            return results

        raise ValueError(f"Input path is not a file or directory: {input_path}")

    def convert_file(self, file_path: Path) -> ConversionResult:
        try:
            file_type = detect_file_type(file_path)
            output_dir, image_dir = self.output_writer.prepare_output_dirs(file_path)

            parser = self.router.get_parser(file_type)
            parsed_document = parser.parse(
                file_path=file_path,
                image_dir=image_dir,
            )

            output_markdown = self.output_writer.write_document(
                parsed_document=parsed_document,
                output_dir=output_dir,
            )

            return ConversionResult(
                source_file=file_path.name,
                success=True,
                output_markdown=output_markdown,
                output_dir=output_dir,
                image_count=len(parsed_document.images),
                warnings=parsed_document.warnings,
                error=None,
            )

        except Exception as exc:
            logger.exception("Failed to convert file: %s", file_path)

            return ConversionResult(
                source_file=file_path.name,
                success=False,
                output_markdown=None,
                output_dir=None,
                image_count=0,
                warnings=[],
                error=str(exc),
            )
