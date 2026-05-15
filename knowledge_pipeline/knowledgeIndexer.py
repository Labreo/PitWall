import os
from pathlib import Path
from knowledge_pipeline.docling_parser import DoclingParser
from knowledge_pipeline.motorsport_chunker import MotorsportChunker
from knowledge_pipeline.motorsport_vector_index import MotorsportVectorIndex

def main():
    raw_dir = Path("data/knowledge/raw_docs")
    if not raw_dir.exists():
        print(f"Directory {raw_dir} does not exist.")
        return

    parser = DoclingParser()
    chunker = MotorsportChunker()
    index = MotorsportVectorIndex()

    pdf_files = list(raw_dir.glob("*.pdf"))
    if not pdf_files:
        print("No PDF files found in data/knowledge/raw_docs.")
        return

    for pdf_path in pdf_files:
        print(f"Processing {pdf_path.name}...")
        
        # 1. Parse
        md_path = parser.parse_pdf(str(pdf_path))
        
        # 2. Chunk
        chunks = chunker.chunk_markdown(md_path)
        print(f"Generated {len(chunks)} chunks.")
        
        # 3. Index
        index.add_chunks(chunks)
        print(f"Successfully indexed {pdf_path.name}.")

if __name__ == "__main__":
    main()
