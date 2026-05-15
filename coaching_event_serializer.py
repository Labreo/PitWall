"""
coaching_event_serializer.py — Maps Python metrics and AI insights to Frontend JSON.
"""
import uuid
from typing import Any

def serialize_coaching_event(context: dict[str, Any], advice_data: dict[str, Any], trigger_ts: int) -> dict[str, Any]:
    """
    Combines telemetry metrics with LLM-generated insights.
    """
    # Determine category based on metrics
    category = "apex"
    if (context.get("braking_aggressiveness") or 0) > 0.8:
        category = "braking"
    elif (context.get("throttle_application_quality") or 1) < 0.6:
        category = "throttle"
    elif (context.get("steering_stability") or 1) < 0.5:
        category = "racing_line"

    return {
        "id": str(uuid.uuid4()),
        "timestamp": int(trigger_ts),
        "lap_number": int(context.get("lap_number", 0)),
        "corner_id": context.get("corner_id"),
        "severity": advice_data.get("severity", context.get("coaching_priority", "info")),
        "category": category,
        "message": advice_data.get("coaching_line", "Check your telemetry."),
        "corner_summary": advice_data.get("corner_summary", ""),
        "confidence_reasoning": advice_data.get("confidence_reasoning", ""),
        "delta_time_loss": round(context.get("time_loss_vs_best_lap", 0), 2) if context.get("time_loss_vs_best_lap") else 0,
        "confidence_score": round(context.get("confidence_score", 0), 2),
        "telemetry_summary": {
            "entry_speed": context.get("entry_speed_kmh"),
            "apex_speed": context.get("min_speed_kmh"),
            "exit_speed": context.get("exit_speed_kmh"),
            "brake_score": round(context.get("braking_aggressiveness", 0), 2),
            "throttle_score": round(context.get("throttle_application_quality", 0), 2)
        }
    }
