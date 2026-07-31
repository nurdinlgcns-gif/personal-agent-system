import argparse
import sys
from pathlib import Path

from doc_to_md.config import DEFAULT_OUTPUT_DIR
from doc_to_md.core.converter import DocumentConverter
from doc_to_md.utils.logger import get_logger

logger = get_logger(__name__)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="doc-to-md",
        description="Convert PDF, XLSX, PPTX, and DOCX documents to Markdown.",
    )

    subparsers = parser.add_subparsers(dest="command")

    convert_parser = subparsers.add_parser(
        "convert",
        help="Convert a file or folder to Markdown.",
    )

    convert_parser.add_argument(
        "input_path",
        type=str,
        help="Input file or folder path.",
    )

    convert_parser.add_argument(
        "--output",
        type=str,
        default=str(DEFAULT_OUTPUT_DIR),
        help="Output directory. Default: output/converted",
    )

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.command != "convert":
        parser.print_help()
        return 1

    input_path = Path(args.input_path)
    output_dir = Path(args.output)

    converter = DocumentConverter(output_root=output_dir)

    try:
        results = converter.convert_path(input_path)

        print("")
        print("Conversion Summary")
        print("==================")

        for result in results:
            status = "OK" if result.success else "FAILED"
            print(f"[{status}] {result.source_file}")

            if result.output_markdown:
                print(f"  Markdown : {result.output_markdown}")

            print(f"  Images   : {result.image_count}")
            print(f"  Warnings : {len(result.warnings)}")

            for warning in result.warnings:
                print(f"    - {warning}")

            if result.error:
                print(f"  Error    : {result.error}")

        failed = [item for item in results if not item.success]
        return 1 if failed else 0

    except Exception as exc:
        logger.exception("Unexpected conversion error")
        print(f"[ERROR] {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())