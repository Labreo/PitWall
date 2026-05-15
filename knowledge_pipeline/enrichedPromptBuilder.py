from typing import Dict, Any
from .knowledgeRetriever import KnowledgeRetriever
from .coachingTopicClassifier import CoachingTopicClassifier

class EnrichedPromptBuilder:
    """
    Constructs augmented prompts for Granite by combining deterministic 
    telemetry analysis with retrieved racing theory.
    """
    
    def __init__(self):
        self.retriever = KnowledgeRetriever()
        self.classifier = CoachingTopicClassifier()

    def build_enriched_prompt(self, context: Dict[str, Any]) -> str:
        """
        Main entry point for building the grounded engineering prompt.
        """
        corner_id = context.get("corner_id", "Unknown")
        corner_type = context.get("corner_type", "corner")
        brake = context.get("braking_aggressiveness") or 0.0
        throttle = context.get("throttle_application_quality") or 0.0
        steer = context.get("steering_stability") or 0.0
        time_loss = context.get("time_loss_vs_best_lap") or 0.0
        priority = context.get("coaching_priority", "info")

        # 1. Topic Classification
        topic = self.classifier.classify_issue(context)
        
        # 2. Knowledge Retrieval
        theory_context = self.retriever.retrieve_coaching_knowledge(topic)

        # 3. Prompt Assembly
        prompt = f"""
SYSTEM INSTRUCTION: You are a professional Race Engineer. 
Your task is to provide technical coaching based on TELEMETRY DATA and established MOTORSPORT THEORY.
DO NOT invent physics. DO NOT speculate on car setup. ONLY explain the telemetry using the provided theory.

DETERMINISTIC TELEMETRY FINDINGS:
- Corner: {corner_id} ({corner_type})
- Braking Score: {brake:.2f}
- Throttle Score: {throttle:.2f}
- Steering Stability: {steer:.2f}
- Recorded Time Loss: {time_loss:.3f}s
- Engineering Priority: {priority}

{theory_context}

TASK:
1. Summarize the driver's performance in this corner.
2. Provide a single direct coaching instruction (max 12 words).
3. Explain the technical reasoning by explicitly linking the TELEMETRY FINDINGS to the RELEVANT MOTORSPORT THEORY.

Return ONLY a single-line JSON object:
{{
  "corner_summary": "Technical summary",
  "coaching_line": "Direct advice",
  "severity": "{priority}",
  "confidence_reasoning": "Technical explanation grounded in theory",
  "source_attribution": "Referenced theory source"
}}
"""
        return prompt.strip()

if __name__ == "__main__":
    builder = EnrichedPromptBuilder()
    print(builder.build_enriched_prompt({"corner_id": "T1", "braking_aggressiveness": 0.5}))
