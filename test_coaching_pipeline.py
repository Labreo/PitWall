"""
test_coaching_pipeline.py — End-to-end validation of the real Ollama/Granite pipeline.
"""
import json
import os
import logging
from coaching_event_generator import CoachingEventGenerator
from ollama_client import OllamaClient

# Set up logging to see the pipeline progress
logging.basicConfig(level=logging.INFO)

def test_real_pipeline():
    telemetry_path = "data/processed/normalized_session.json"
    if not os.path.exists(telemetry_path):
        print(f"Error: {telemetry_path} not found.")
        return

    # Initialize generator with real Ollama client
    # Note: Requires local Ollama running with granite3.1-dense:2b
    generator = CoachingEventGenerator()
    
    # Run pipeline
    print("\n--- Starting Real Telemetry-to-Granite Pipeline ---")
    try:
        events = generator.run_pipeline(telemetry_path)
        
        print(f"\n--- Pipeline Results ---")
        print(f"Total Events Generated: {len(events)}")
        
        if len(events) > 0:
            for e in events[:2]:
                print(f"\nEvent: {e['id']}")
                print(f"  Corner: {e['corner_id']} | Lap: {e['lap_number']}")
                print(f"  Summary: {e.get('corner_summary')}")
                print(f"  Advice:  {e['message']}")
                print(f"  Reason:  {e.get('confidence_reasoning')}")
                print(f"  Trigger: {e['timestamp']}ms")

        # Save output for frontend
        output_path = "frontend/src/utils/coaching_events.json"
        with open(output_path, "w") as f:
            json.dump(events, f, indent=2)
        print(f"\nSuccessfully exported to {output_path}")

    except Exception as e:
        print(f"\nPipeline failed: {str(e)}")
        print("Tip: Ensure 'ollama serve' is running and 'ollama pull granite3.1-dense:2b' is complete.")

if __name__ == "__main__":
    test_real_pipeline()
