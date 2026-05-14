import sys
import json
import logging
import pandas as pd
from lap_detector import LapDetector
from lap_validation import validate_laps

class Color:
    HEADER = '\033[95m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

logging.basicConfig(level=logging.INFO, format=f'{Color.OKCYAN}%(asctime)s - %(levelname)s - %(message)s{Color.ENDC}')

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_lap_detection.py <normalized_json>")
        sys.exit(1)
        
    path = sys.argv[1]
    logging.info(f"Loading {path}...")
    with open(path, 'r') as f:
        data = json.load(f)
        
    df = pd.DataFrame(data)
    
    # Initialize the detector
    detector = LapDetector(min_lap_duration_sec=30, proximity_threshold_m=20.0)
    laps = detector.detect_laps(df)
    
    # Validate the laps (e.g. discard incredibly short or incredibly long laps)
    laps = validate_laps(laps)
    
    print(f"\n{Color.HEADER}{Color.BOLD}## LAP SUMMARY{Color.ENDC}\n")
    print(f"Detected {len(laps)} total laps.")
    
    valid_laps = [l for l in laps if l['is_valid']]
    if valid_laps:
        avg_time = sum([l['lap_duration_seconds'] for l in valid_laps]) / len(valid_laps)
        print(f"Average valid lap time: {avg_time:.2f}s\n")
    
    for lap in laps:
        if lap['is_valid']:
            status = f"{Color.OKGREEN}✓ VALID{Color.ENDC}"
        else:
            status = f"{Color.FAIL}✗ INVALID ({lap['warning']}){Color.ENDC}"
            
        print(f"Lap {lap['lap_number']}: {lap['lap_duration_seconds']:.2f}s | {status}")
        print(f"  [Time: {lap['start_timestamp']} -> {lap['end_timestamp']}]")
        
    print("\n")

if __name__ == "__main__":
    main()
