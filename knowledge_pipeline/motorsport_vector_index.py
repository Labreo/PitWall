import os
import json
import numpy as np
import faiss
from pathlib import Path
from typing import List, Dict
from sentence_transformers import SentenceTransformer

class MotorsportVectorIndex:
    def __init__(self, model_name="all-MiniLM-L6-v2", index_path="data/knowledge/embeddings/index.faiss"):
        # Local-first embeddings
        self.model = SentenceTransformer(model_name)
        self.index_path = Path(index_path)
        self.metadata_path = self.index_path.with_suffix(".json")
        self.index = None
        self.metadata = []

        if self.index_path.exists():
            self.load()

    def add_chunks(self, chunks: List[Dict]):
        """Generates embeddings and adds to the FAISS index."""
        texts = [c["text"] for c in chunks]
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        
        dimension = embeddings.shape[1]
        if self.index is None:
            self.index = faiss.IndexFlatL2(dimension)
        
        self.index.add(embeddings)
        self.metadata.extend(chunks)
        self.save()

    def search(self, query: str, top_k=3) -> List[Dict]:
        """Searches the index for relevant snippets."""
        if self.index is None:
            return []
        
        query_embedding = self.model.encode([query], convert_to_numpy=True)
        distances, indices = self.index.search(query_embedding, top_k)
        
        results = []
        for idx in indices[0]:
            if idx < len(self.metadata):
                results.append(self.metadata[idx])
        
        return results

    def save(self):
        faiss.write_index(self.index, str(self.index_path))
        with open(self.metadata_path, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f)

    def load(self):
        self.index = faiss.read_index(str(self.index_path))
        with open(self.metadata_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)

if __name__ == "__main__":
    idx = MotorsportVectorIndex()
    # idx.add_chunks([{"text": "Sample text", "metadata": {"source": "test"}}])
