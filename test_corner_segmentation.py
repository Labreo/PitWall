import sys
import json
import logging
import pandas as pd
import matplotlib.pyplot as plt
from corner_segmentation import CornerSegmenter

class Color:
    HEADER = '\033[95m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

logging.basicConfig(level=logging.INFO, format=f'{Color.OKCYAN}%(asctime)s - %(levelname)s - %(message)s{Color.ENDC}')

def plot_segments(segments, output_file):
    plt.figure(figsize=(10, 8))
    
    for seg in segments:
        path = seg['gps_path']
        lats = [p['latitude'] for p in path]
        lons = [p['longitude'] for p in path]
        
        if seg['segment_type'] == 'straight':
            plt.plot(lons, lats, color='blue', linewidth=2, alpha=0.5)
        else:
            plt.plot(lons, lats, color='red', linewidth=3)
            # Annotate corner
            mid_idx = len(lats) // 2
            if mid_idx > 0 and seg['duration_seconds'] > 3.0:
                plt.annotate(seg['segment_id'], (lons[mid_idx], lats[mid_idx]), 
                             fontsize=8, ha='center', va='center',
                             bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="red", alpha=0.7))
                
    plt.title("Track Segmentation (Red=Corner, Blue=Straight)")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.axis('equal')
    plt.grid(True)
    plt.tight_layout()
    plt.savefig(output_file)
    plt.close()
    logging.info(f"Saved visualization to {output_file}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_corner_segmentation.py <normalized_json>")
        sys.exit(1)
        
    path = sys.argv[1]
    logging.info(f"Loading {path}...")
    with open(path, 'r') as f:
        data = json.load(f)
        
    df = pd.DataFrame(data)
    
    # We will run this on Lap 2 to avoid plotting the entire session
    # In a real scenario, we'd slice by start/end timestamps of a lap.
    # For now, let's just slice a ~100 second chunk representing a lap.
    # Or just segment the whole file and plot everything.
    # We'll just run it on the whole file to get the total count.
    
    from corner_segmentation import CornerSegmenterConfig
    
    config = CornerSegmenterConfig(heading_rate_threshold=7.0, min_fragment_duration_sec=1.5)
    segmenter = CornerSegmenter(config=config)
    segments = segmenter.segment_track(df)
    
    corners = [s for s in segments if s['segment_type'] == 'corner']
    straights = [s for s in segments if s['segment_type'] == 'straight']
    
    print(f"\n{Color.HEADER}{Color.BOLD}## SEGMENTATION SUMMARY{Color.ENDC}\n")
    print(f"Total Segments: {len(segments)}")
    print(f"Total Corners: {len(corners)}")
    print(f"Total Straights: {len(straights)}")
    
    print(f"\n{Color.HEADER}{Color.BOLD}## CORNER DETAILS{Color.ENDC}\n")
    
    # Print the first few corners as a summary
    for seg in corners[:10]:
        change = seg['heading_change_degrees']
        print(f"[{seg['segment_id']}] {seg['classification']}")
        print(f"  Duration: {seg['duration_seconds']:.1f}s | Avg Speed: {seg['average_speed']:.1f}km/h | Net Heading Change: {change:.1f}°")
        
    if len(corners) > 10:
        print("...")

    # Plot
    plot_file = "data/processed/refined_track_segments.png"
    plot_segments(segments, plot_file)
    
    print(f"\n{Color.OKGREEN}{Color.BOLD}✓ Segmentation Complete{Color.ENDC}\n")

if __name__ == "__main__":
    main()
