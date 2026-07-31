from abc import ABC, abstractmethod
from pathlib import Path

from doc_to_md.core.models import ParsedDocument


class BaseParser(ABC):
    @abstractmethod
    def parse(self, file_path: Path, image_dir: Path) -> ParsedDocument:
        raise NotImplementedError
