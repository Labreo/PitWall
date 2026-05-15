from typing import Any
from knowledge_pipeline.enrichedPromptBuilder import EnrichedPromptBuilder

# Global instance for performance
_builder = EnrichedPromptBuilder()

def build_granite_prompt(context: dict[str, Any]) -> str:
    """
    Wrapper for the EnrichedPromptBuilder to maintain backward compatibility.
    """
    return _builder.build_enriched_prompt(context)
