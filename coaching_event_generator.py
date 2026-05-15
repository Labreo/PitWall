"""
coaching_event_generator.py — Orchestrator for the telemetry-to-Ollama pipeline.
"""
import json
import pandas as pd
import logging
from typing import Any
from lap_detector import LapDetector
from corner_segmentation import CornerSegmenter
from coaching_context_builder import build_coaching_context
from granite_prompt_builder import build_granite_prompt
from coaching_event_serializer import serialize_coaching_event
from ollama_client import OllamaClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CoachingEventGenerator:
    def __init__(self, ollama_client=None):
        self.ollama_client = ollama_client or OllamaClient()

    def run_pipeline(self, telemetry_path: str) -> list[dict[str, Any]]:
        """
        Runs the full telemetry-to-advice pipeline with local Ollama inference.
        """
        # 1. Load telemetry
        logger.info(f"Loading telemetry from {telemetry_path}...")
        with open(telemetry_path, "r") as f:
            telemetry_list = json.load(f)
        df = pd.DataFrame(telemetry_list)

        # 2. Extract Structure
        logger.info("Detecting laps and segments...")
        laps = LapDetector().detect_laps(df)
        segments = CornerSegmenter().segment_track(df)
        
        # 3. Assemble Session for Brain
        session = {
            "telemetry": telemetry_list,
            "segments": segments,
            "laps": laps
        }

        # 4. Generate Metrics
        logger.info("Building coaching context metrics...")
        contexts = build_coaching_context(session)
        
        # 5. Filter and Generate Advice
        coaching_events = []
        for ctx in contexts:
            # Only coach significant issues
            if ctx.get("coaching_priority") not in ["critical", "warn"]:
                continue
            
            # Find the actual trigger timestamp (600ms offset from corner entry)
            matching_seg = next((
                s for s in segments 
                if s["segment_id"] == ctx["corner_id"] 
                and any(
                    lap["lap_number"] == ctx["lap_number"] 
                    and lap["start_timestamp"] <= s["start_timestamp"] <= lap["end_timestamp"]
                    for lap in laps
                )
            ), None)
            
            if not matching_seg:
                continue
            
            trigger_ts = matching_seg['start_timestamp'] + 600

            # 6. Generate deterministic advice via Ollama
            prompt = build_granite_prompt(ctx)
            advice_data = self.ollama_client.generate_advice(prompt)
            
            # 7. Serialize
            event = serialize_coaching_event(ctx, advice_data, trigger_ts)
            coaching_events.append(event)

        logger.info(f"Successfully generated {len(coaching_events)} real coaching events via Granite.")
        return coaching_events

if __name__ == "__main__":
    generator = CoachingEventGenerator()
    events = generator.run_pipeline("data/processed/normalized_session.json")
    
    output_file = "frontend/src/utils/coaching_events.json"
    with open(output_file, "w") as f:
        json.dump(events, f, indent=2)
    print(f"Exported to {output_file}")
