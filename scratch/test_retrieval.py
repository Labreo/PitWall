from knowledge_pipeline.knowledge_retriever import KnowledgeRetriever

def test_retrieval():
    retriever = KnowledgeRetriever()
    queries = [
        "trail braking technique",
        "apex strategy",
        "throttle application"
    ]
    
    for query in queries:
        print(f"\nQUERY: {query}")
        theory = retriever.get_relevant_theory(query)
        if theory:
            print(f"RETRIEVED THEORY:\n{theory[:500]}...")
        else:
            print("No theory found.")

if __name__ == "__main__":
    test_retrieval()
