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

        # 3. Handle Repetition Context
        repetition_count = context.get("repetition_count", 0)
        repetition_instruction = ""
        if repetition_count > 0:
            repetition_instruction = f"NOTE: This is the {repetition_count + 1}th time you are coaching this corner in this session. DO NOT repeat your previous advice verbatim. Focus on a different technical nuance or use a more urgent tone."

        # 4. Prompt Assembly
        prompt = f"""
SYSTEM INSTRUCTION: You are a professional Race Engineer and Driver Coach speaking directly to the driver in the cockpit via radio.
Your task is to provide technical driver coaching based on TELEMETRY DATA and established MOTORSPORT THEORY.

CRITICAL ROLE DIRECTIVES:
1. Speak directly to the driver using highly actionable, in-cockpit advice (e.g., braking markers, trail braking modulation, smooth throttle squeeze, visual targets, steer inputs).
2. NEVER suggest engineering, chassis, or setup changes (such as suspension rates, spring stiffness, roll stiffness, anti-roll bars, damper adjustments, camber, or tire pressure changes). The driver is currently driving the car and cannot change the car's physical setup mid-session. Translate all physical concepts into driver control inputs.
3. DO NOT invent physics. DO NOT speculate on car setup. ONLY explain the telemetry findings using the provided driver-focused motorsport theory.

DETERMINISTIC TELEMETRY FINDINGS:
- Corner: {corner_id} ({corner_type})
- Braking Score: {brake:.2f}
- Throttle Score: {throttle:.2f}
- Steering Stability: {steer:.2f}
- Recorded Time Loss: {time_loss:.3f}s
- Engineering Priority: {priority}

{repetition_instruction}

{theory_context}

TASK:
1. Summarize the driver's performance in this corner.
2. Provide a single direct coaching instruction (max 12 words) that is actionable in-cockpit.
3. Explain the technical reasoning by explicitly linking the TELEMETRY FINDINGS to the RELEVANT MOTORSPORT THEORY (attributing it to the source document).

Return ONLY a single-line JSON object:
{{
  "corner_summary": "Technical summary of what the driver did",
  "coaching_line": "Direct, actionable in-cockpit advice (max 12 words)",
  "severity": "{priority}",
  "confidence_reasoning": "Technical explanation grounding driver telemetry inputs in the referenced theory",
  "source_attribution": "Referenced theory source"
}}
"""
        return prompt.strip()

if __name__ == "__main__":
    builder = EnrichedPromptBuilder()
    print(builder.build_enriched_prompt({"corner_id": "T1", "braking_aggressiveness": 0.5}))
