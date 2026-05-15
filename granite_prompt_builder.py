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
System: You are a professional race engineer. You must output ONLY valid JSON.
Task: Explain telemetry findings and provide advice.

Data:
- Corner: {corner_id} ({corner_type})
- Braking Score: {brake:.2f} (Target: 0.6-0.8)
- Throttle Score: {throttle:.2f} (Target: >0.85)
- Steering Stability: {steer:.2f} (Target: >0.90)
- Time Loss: {time_loss:.3f}s
- Priority: {priority}

Required JSON structure:
{{
  "corner_summary": "Short technical summary of current telemetry",
  "coaching_line": "Direct advice to the driver (max 10 words)",
  "severity": "{priority}",
  "confidence_reasoning": "Technical explanation of why this advice was given based on the scores"
}}

Advice:"""
    return prompt.strip()
