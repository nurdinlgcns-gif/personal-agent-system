from doc_to_md.parsers.base_parser import BaseParser
from doc_to_md.parsers.docx_parser import DocxParser
from doc_to_md.parsers.pdf_parser import PdfParser
from doc_to_md.parsers.pptx_parser import PptxParser
from doc_to_md.parsers.xlsx_parser import XlsxParser


class ParserRouter:
    def __init__(self) -> None:
        self._parsers: dict[str, BaseParser] = {
            "pdf": PdfParser(),
            "xlsx": XlsxParser(),
            "pptx": PptxParser(),
            "docx": DocxParser(),
        }

    def get_parser(self, file_type: str) -> BaseParser:
        parser = self._parsers.get(file_type)

        if parser is None:
            raise ValueError(f"No parser registered for file type: {file_type}")

        return parser
