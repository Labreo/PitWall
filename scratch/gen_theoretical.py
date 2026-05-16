import json
import os

def select_best_segments(laps, segments):
    segment_groups = {}
    for seg in segments:
        base_id = seg['segment_id'].split('_')[0]
        if base_id not in segment_groups:
            segment_groups[base_id] = []
        segment_groups[base_id].append(seg)
    
    best_sectors = []
    for base_id in segment_groups:
        sorted_segs = sorted(segment_groups[base_id], key=lambda x: x['duration_seconds'])
        best_sectors.append(sorted_segs[0])
    
    return sorted(best_sectors, key=lambda x: x['start_timestamp'])

def assemble_theoretical_lap(telemetry, best_sectors):
    result_telemetry = []
    current_timestamp = 0
    
    for seg in best_sectors:
        slice_points = [t for t in telemetry if seg['start_timestamp'] <= t['timestamp'] <= seg['end_timestamp']]
        if not slice_points:
            continue
            
        slice_start = slice_points[0]['timestamp']
        for t in slice_points:
            new_pt = t.copy()
            new_pt['original_timestamp'] = t['timestamp']
            new_pt['timestamp'] = current_timestamp + (t['timestamp'] - slice_start)
            result_telemetry.append(new_pt)
            
        current_timestamp += (seg['end_timestamp'] - seg['start_timestamp'])
        
    return {
        "telemetry": result_telemetry,
        "totalDurationMs": current_timestamp,
        "sectors": best_sectors
    }

def run():
    with open('frontend/public/demo/telemetry.json', 'r') as f:
        telemetry = json.load(f)
    with open('frontend/public/demo/laps.json', 'r') as f:
        laps = json.load(f)
    with open('frontend/public/demo/segments.json', 'r') as f:
        segments = json.load(f)
        
    best_sectors = select_best_segments(laps, segments)
    t_lap = assemble_theoretical_lap(telemetry, best_sectors)
    
    with open('frontend/public/demo/theoretical_best.json', 'w') as f:
        json.dump(t_lap, f, indent=2)
    print("✅ Generated theoretical_best.json")

if __name__ == "__main__":
    run()
