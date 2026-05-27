from .motorsport_vector_index import MotorsportVectorIndex

class KnowledgeRetriever:
    def __init__(self):
        self.index = MotorsportVectorIndex()

    def retrieve_coaching_knowledge(self, topic: str, top_k: int = 2) -> str:
        """
        Retrieves relevant theory snippets with source attribution,
        prioritizing driver-focused publications over mathematical car setup theses.
        """
        # Search a larger pool of raw results so we can filter/re-prioritize
        raw_results = self.index.search(topic, top_k=8)
        if not raw_results:
            return "No specific racing theory available for this topic."
        
        driver_results = []
        chassis_results = []
        
        for r in raw_results:
            source = r.get("metadata", {}).get("source", "Unknown Source")
            # Goodman's Formula Student thesis is purely mechanical/engineering focused
            if "Goodman" in source or "MPhil" in source:
                chassis_results.append(r)
            else:
                driver_results.append(r)
                
        # Prioritize driver training and techniques; fall back to mechanical chassis dynamics only if necessary
        results = driver_results + chassis_results
        results = results[:top_k]
        
        formatted_results = []
        for r in results:
            source = r.get("metadata", {}).get("source", "Unknown Source")
            text = r.get("text", "")
            # Clean source name for presentation
            clean_source = source.replace("_reduced", "").replace("-", " ").replace("20210928 1", "")
            formatted_results.append(f"SOURCE: {clean_source}\nTHEORY: {text}")
            
        theory_block = "\n---\n".join(formatted_results)
        return f"\nRELEVANT MOTORSPORT THEORY (STRICT REFERENCES):\n{theory_block}\n"

if __name__ == "__main__":
    retriever = KnowledgeRetriever()
    print(retriever.retrieve_coaching_knowledge("trail braking"))
