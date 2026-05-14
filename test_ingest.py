import sys
import logging
from telemetry_ingest import TelemetryIngestor

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_ingest.py <path_to_mp4>")
        sys.exit(1)
        
    mp4_path = sys.argv[1]
    
    ingestor = TelemetryIngestor(output_dir="data/raw")
    
    try:
        json_path = ingestor.extract_from_mp4(mp4_path)
        analysis = ingestor.analyze_raw_json(json_path)
        ingestor.print_analysis(analysis)
        print("\nSuccess: Telemetry extracted and analyzed.")
    except Exception as e:
        logging.error(f"Failed to ingest telemetry: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
