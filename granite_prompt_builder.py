"""
granite_prompt_builder.py — Constructs deterministic JSON prompts for Granite.
"""
from typing import Any

def build_granite_prompt(context: dict[str, Any]) -> str:
    """
    Creates a structured engineering prompt that forces a JSON response from Granite.
    """
    corner_id = context.get("corner_id", "Unknown")
    corner_type = context.get("corner_type", "corner")
    
    # Safely extract metrics
    brake = context.get("braking_aggressiveness") or 0.0
    throttle = context.get("throttle_application_quality") or 0.0
    steer = context.get("steering_stability") or 0.0
    time_loss = context.get("time_loss_vs_best_lap") or 0.0
    priority = context.get("coaching_priority", "info")

    prompt = f"""
Input Data:
- Corner: {corner_id} ({corner_type})
- Braking Score: {brake:.2f}
- Throttle Score: {throttle:.2f}
- Steering Stability: {steer:.2f}
- Time Loss: {time_loss:.3f}s
- Priority: {priority}

Task: You are a race engineer. Return ONLY a single-line JSON object (no newlines) with this exact structure:
{{
  "corner_summary": "Summary of performance",
  "coaching_line": "Direct advice (max 10 words)",
  "severity": "{priority}",
  "confidence_reasoning": "Technical explanation"
}}
"""
    return prompt.strip()
