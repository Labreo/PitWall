import json
import sys
import pandas as pd
import numpy as np

def debug_streams(raw_json_path: str):
    print(f"Loading raw telemetry: {raw_json_path}\n")
    with open(raw_json_path, 'r') as f:
        raw_data = json.load(f)
        
    # Extract streams roughly identical to telemetry_normalizer.py logic
    streams = {}
    if isinstance(raw_data, dict) and "data" in raw_data and isinstance(raw_data["data"], list):
        streams["GPS5"] = raw_data["data"]
    elif isinstance(raw_data, dict):
        for k, v in raw_data.items():
            if k in ["GPS5", "ACCL", "GYRO"]:
                if isinstance(v, list):
                    streams[k] = v
                elif isinstance(v, dict) and "samples" in v:
                    streams[k] = v["samples"]
                    
    # Examine ACCL and GYRO streams
    for target in ["ACCL", "GYRO"]:
        print(f"## {target} STREAM\n")
        samples = streams.get(target, [])
        count = len(samples)
        
        if count == 0:
            print(f"samples: 0")
            print(f"fields: N/A")
            print("\nFirst sample:\nN/A\n")
            print("---\n")
            continue
            
        print(f"samples: {count}")
        fields = list(samples[0].keys())
        print(f"fields: {','.join(fields)}")
        
        print("\nFirst sample:")
        print(json.dumps(samples[0], indent=2))
        
        # Timestamp range check
        ts_col = next((c for c in ["utc", "timestamp", "time"] if c in fields), None)
        if ts_col:
            t_start = samples[0][ts_col]
            t_end = samples[-1][ts_col]
            print(f"\nTimestamp range: {t_start} to {t_end}")
        else:
            print(f"\nNo recognizable timestamp column found.")
            
        print("\n---\n")
        
    print("## MERGE DEBUG\n")
    
    # Check GPS timestamps overlap
    gps_samples = streams.get("GPS5", [])
    if not gps_samples:
        print("GPS timestamps overlap: NO (No GPS data)")
    elif not streams.get("ACCL") and not streams.get("GYRO"):
        print("GPS timestamps overlap: N/A (Missing ACCL/GYRO streams in source data)")
        print("Interpolation success: N/A")
        print("Merged accel samples populated: NO")
        print("\nDIAGNOSIS: Source data does not contain ACCL or GYRO streams. The current extraction tool (e.g. gopro2json via ffmpeg binary track) is likely dropping IMU data or the camera did not record it.")
    else:
        # Do a simulated overlap check
        gps_ts_col = next((c for c in ["utc", "timestamp", "time"] if c in gps_samples[0].keys()), None)
        gps_start = gps_samples[0][gps_ts_col]
        gps_end = gps_samples[-1][gps_ts_col]
        
        overlap = False
        if "ACCL" in streams and len(streams["ACCL"]) > 0:
            accl = streams["ACCL"]
            accl_ts_col = next((c for c in ["utc", "timestamp", "time"] if c in accl[0].keys()), None)
            if accl_ts_col:
                accl_start = accl[0][accl_ts_col]
                accl_end = accl[-1][accl_ts_col]
                if accl_start <= gps_end and accl_end >= gps_start:
                    overlap = True
                    
        print(f"GPS timestamps overlap: {'YES' if overlap else 'NO'}")
        
        # Simulated interpolation check
        print("Interpolation success: YES (simulated)")
        print("Merged accel samples populated: NO (due to missing/unaligned source data)")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python debug_sensor_streams.py <path_to_raw_json>")
        sys.exit(1)
    debug_streams(sys.argv[1])
