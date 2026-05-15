from .motorsport_vector_index import MotorsportVectorIndex

class KnowledgeRetriever:
    def __init__(self):
        self.index = MotorsportVectorIndex()

    def retrieve_coaching_knowledge(self, topic: str, top_k: int = 2) -> str:
        """
        Retrieves relevant theory snippets with source attribution.
        """
        results = self.index.search(topic, top_k=top_k)
        if not results:
            return "No specific racing theory available for this topic."
        
        formatted_results = []
        for r in results:
            source = r.get("metadata", {}).get("source", "Unknown Source")
            text = r.get("text", "")
            formatted_results.append(f"SOURCE: {source}\nTHEORY: {text}")
            
        theory_block = "\n---\n".join(formatted_results)
        return f"\nRELEVANT MOTORSPORT THEORY (STRICT REFERENCES):\n{theory_block}\n"

if __name__ == "__main__":
    retriever = KnowledgeRetriever()
    print(retriever.retrieve_coaching_knowledge("trail braking"))
