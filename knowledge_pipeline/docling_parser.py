import os
import json
from pathlib import Path
from docling.document_converter import DocumentConverter

class DoclingParser:
    def __init__(self, output_dir="data/knowledge/parsed"):
        self.converter = DocumentConverter()
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def parse_pdf(self, pdf_path: str):
        """Parses a PDF file and saves the structured output as JSON."""
        print(f"Parsing {pdf_path}...")
        result = self.converter.convert(pdf_path)
        
        # Export to markdown for chunking
        markdown_content = result.document.export_to_markdown()
        
        file_name = Path(pdf_path).stem
        output_path = self.output_dir / f"{file_name}.md"
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(markdown_content)
            
        return str(output_path)

if __name__ == "__main__":
    parser = DoclingParser()
    # Example usage: parser.parse_pdf("data/knowledge/raw_docs/racing_theory.pdf")
