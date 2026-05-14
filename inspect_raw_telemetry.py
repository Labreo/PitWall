import json
import logging
import math
import sys
from collections import defaultdict
from typing import Dict, Any, List

class Color:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

logging.basicConfig(level=logging.INFO, format=f'{Color.OKBLUE}%(asctime)s - %(levelname)s - %(message)s{Color.ENDC}')
logger = logging.getLogger(__name__)

def inspect_telemetry(file_path: str):
    logger.info(f"Loading raw telemetry from: {file_path}")
    try:
        with open(file_path, "r") as f:
            raw_data = json.load(f)
    except Exception as e:
        logger.error(f"{Color.FAIL}Failed to read JSON: {e}{Color.ENDC}")
        sys.exit(1)

    streams = {}

    # Handle `gopro-utils` gopro2json format which outputs just {"data": [...] }
    if isinstance(raw_data, dict) and "data" in raw_data and isinstance(raw_data["data"], list):
        streams["GPS5"] = raw_data["data"]
    # Handle gopro-telemetry complex format (heuristic fallback)
    elif isinstance(raw_data, dict):
        for k, v in raw_data.items():
            if k in ["GPS5", "ACCL", "GYRO"]:
                if isinstance(v, list):
                    streams[k] = v
                elif isinstance(v, dict) and "samples" in v:
                    streams[k] = v["samples"]
    else:
        logger.error(f"{Color.FAIL}Unknown JSON structure.{Color.ENDC}")
        sys.exit(1)

    if not streams:
        logger.error(f"{Color.FAIL}No recognized streams found.{Color.ENDC}")
        sys.exit(1)

    print(f"\n{Color.HEADER}{Color.BOLD}## STREAM SUMMARY{Color.ENDC}\n")

    gps_valid = True
    gps_monotonic = True
    stationary_start = False
    
    for stream_name, samples in streams.items():
        count = len(samples)
        
        # Extract timestamps and check nulls
        timestamps = []
        null_count = 0
        
        for s in samples:
            # check for typical timestamp keys: utc, timestamp, time
            ts = s.get("utc") or s.get("timestamp") or s.get("time")
            if ts is not None:
                timestamps.append(ts)
                
            # null check for important fields
            if any(val is None for val in s.values()):
                null_count += 1
                
            # gps specific checks
            if stream_name == "GPS5":
                lat = s.get("lat")
                lon = s.get("lon")
                if lat is not None and lon is not None:
                    if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
                        gps_valid = False

        null_rate = (null_count / count * 100) if count > 0 else 0

        duration_sec = 0.0
        frequency = 0.0
        
        if timestamps:
            # GoPro UTC timestamps are often in microseconds
            ts_start = timestamps[0]
            ts_end = timestamps[-1]
            if ts_end < ts_start:
                gps_monotonic = False
                
            for i in range(1, len(timestamps)):
                if timestamps[i] < timestamps[i-1]:
                    gps_monotonic = False
                    break
                    
            diff_us = ts_end - ts_start
            duration_sec = diff_us / 1_000_000.0
            if duration_sec > 0:
                frequency = count / duration_sec
                
            if stream_name == "GPS5":
                # Check for stationary period at start (e.g. speed < 0.5 m/s for first 10 samples)
                # Note: spd might be in m/s
                start_speeds = [s.get("spd", 0) for s in samples[:20]]
                if all(spd is not None and spd < 0.5 for spd in start_speeds):
                    stationary_start = True

        print(f"{Color.BOLD}{stream_name}:{Color.ENDC}")
        print(f"samples: {count}")
        if timestamps:
            print(f"estimated frequency: {frequency:.1f}Hz")
            print(f"duration: {duration_sec:.1f}s")
        print(f"null rate: {null_rate:.1f}%\n")
        
        print(f"First 5 samples of {stream_name}:")
        for i in range(min(5, count)):
            print(f"  {samples[i]}")
        print("")

    print(f"{Color.HEADER}{Color.BOLD}## GPS QUALITY{Color.ENDC}\n")
    if "GPS5" in streams:
        if gps_valid:
            print(f"{Color.OKGREEN}✓ GPS coordinates valid{Color.ENDC}")
        else:
            print(f"{Color.FAIL}✗ Malformed GPS coordinates detected{Color.ENDC}")
            
        if gps_monotonic:
            print(f"{Color.OKGREEN}✓ timestamps monotonic{Color.ENDC}")
        else:
            print(f"{Color.FAIL}✗ non-monotonic timestamps detected{Color.ENDC}")
            
        if stationary_start:
            print(f"{Color.WARNING}⚠ stationary period detected at session start{Color.ENDC}")
        else:
            print(f"{Color.OKGREEN}✓ no stationary period at start{Color.ENDC}")
    else:
        print("No GPS data found to analyze.")

    print("\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: python inspect_raw_telemetry.py <path_to_json>")
        sys.exit(1)
    
    inspect_telemetry(sys.argv[1])
