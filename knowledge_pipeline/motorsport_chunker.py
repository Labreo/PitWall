import os
import re
from pathlib import Path
from typing import List, Dict

class MotorsportChunker:
    def __init__(self, chunk_size=1000, overlap=100):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk_markdown(self, md_path: str) -> List[Dict]:
        """Chunks markdown content based on headings and fixed size."""
        with open(md_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Split by headings to maintain context
        sections = re.split(r'(^#+\s.*)', content, flags=re.MULTILINE)
        
        chunks = []
        current_section = ""
        source_name = Path(md_path).stem

        for section in sections:
            if not section.strip():
                continue
            
            # If section itself is a heading, keep it for the next part
            if section.startswith("#"):
                current_section = section
                continue
            
            full_text = current_section + "\n" + section
            
            # Simple fixed-size chunking within sections if they are too long
            if len(full_text) > self.chunk_size:
                sub_chunks = self._fixed_size_chunk(full_text)
                for sc in sub_chunks:
                    chunks.append({
                        "text": sc,
                        "metadata": {"source": source_name, "type": "theory"}
                    })
            else:
                chunks.append({
                    "text": full_text,
                    "metadata": {"source": source_name, "type": "theory"}
                })
        
        return chunks

    def _fixed_size_chunk(self, text: str) -> List[str]:
        """Splits text into overlapping chunks of roughly self.chunk_size."""
        chunks = []
        start = 0
        while start < len(text):
            end = start + self.chunk_size
            chunks.append(text[start:end])
            start += (self.chunk_size - self.overlap)
        return chunks

if __name__ == "__main__":
    chunker = MotorsportChunker()
    # chunks = chunker.chunk_markdown("data/knowledge/parsed/racing_theory.md")
