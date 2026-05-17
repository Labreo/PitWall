import pandas as pd
import numpy as np
import logging
from gps_utils import haversine_distance, calculate_heading, heading_difference

logger = logging.getLogger(__name__)

class LapDetector:
    def __init__(self, min_lap_duration_sec=30, proximity_threshold_m=20.0):
        self.min_lap_duration_sec = min_lap_duration_sec
        self.proximity_threshold_m = proximity_threshold_m

    def _infer_start_finish(self, df: pd.DataFrame):
        """
        Dynamically infer a start/finish coordinate by finding a point on the track
        that is passed multiple times in the same direction.
        """
        # Filter stationary points to avoid pitting noise, dynamically scaling for lower-speed disciplines like MTB or Karts
        moving = df[df['speed_kmh'] > 10].copy()
        if moving.empty:
            moving = df[df['speed_kmh'] > 3].copy()
        if moving.empty:
            moving = df.copy() # Absolute fallback to all points if static/walking speed

            
        # Calculate heading for moving points
        next_lat = moving['latitude'].shift(-1).fillna(moving['latitude'])
        next_lon = moving['longitude'].shift(-1).fillna(moving['longitude'])
        moving['heading'] = calculate_heading(
            moving['latitude'].values, moving['longitude'].values,
            next_lat.values, next_lon.values
        )
        
        logger.info("Scanning for dynamic Start/Finish line...")
        
        # Test candidate points (every ~5 seconds = 50 samples at 10Hz)
        candidates = moving.iloc[::50]
        
        best_point = None
        max_visits = 0
        
        lat_arr = moving['latitude'].values
        lon_arr = moving['longitude'].values
        heading_arr = moving['heading'].values
        time_arr = moving['timestamp'].values
        
        for idx, row in candidates.iterrows():
            target_lat = row['latitude']
            target_lon = row['longitude']
            target_heading = row['heading']
            
            distances = haversine_distance(lat_arr, lon_arr, target_lat, target_lon)
            h_diffs = np.array([heading_difference(h, target_heading) for h in heading_arr])
            
            # Mask points within threshold and similar heading
            mask = (distances < self.proximity_threshold_m) & (h_diffs < 30)
            close_times = time_arr[mask]
            
            if len(close_times) == 0:
                continue
                
            visits = 0
            last_visit_time = -np.inf
            
            # Count discrete visits separated by minimum lap time
            for time in close_times:
                if (time - last_visit_time) > self.min_lap_duration_sec * 1000:
                    visits += 1
                    last_visit_time = time
                    
            if visits > max_visits:
                max_visits = visits
                best_point = row
                
        if max_visits < 2:
            logger.warning("Could not find a point crossed multiple times. Likely a point-to-point track.")
            best_point = moving.iloc[0]
            
        logger.info(f"Inferred Start/Finish -> lat: {best_point['latitude']:.5f}, lon: {best_point['longitude']:.5f}, heading: {best_point['heading']:.1f}°")
        return best_point['latitude'], best_point['longitude'], best_point['heading']

    def detect_laps(self, df: pd.DataFrame):
        df = df.copy()
        sf_lat, sf_lon, sf_heading = self._infer_start_finish(df)
        
        # Calculate distances from every point to S/F
        df['dist_to_sf'] = haversine_distance(df['latitude'].values, df['longitude'].values, sf_lat, sf_lon)
        
        next_lat = df['latitude'].shift(-1).fillna(df['latitude'])
        next_lon = df['longitude'].shift(-1).fillna(df['longitude'])
        df['heading'] = calculate_heading(df['latitude'].values, df['longitude'].values, next_lat.values, next_lon.values)
        
        h_diffs = np.array([heading_difference(h, sf_heading) for h in df['heading'].values])
        df['heading_diff'] = h_diffs
        
        # Identify points close to S/F with the correct heading
        close_mask = (df['dist_to_sf'] < self.proximity_threshold_m) & (df['heading_diff'] < 45)
        close_points = df[close_mask]
        
        laps = []
        if close_points.empty:
            logger.warning("No lap crossings detected.")
            return laps
            
        passing_events = []
        current_event = []
        
        for idx, row in close_points.iterrows():
            if not current_event:
                current_event.append(row)
            else:
                # Group contiguous points into a single passing event (within 10 seconds of each other)
                if row['timestamp'] - current_event[-1]['timestamp'] > 10000:
                    passing_events.append(pd.DataFrame(current_event))
                    current_event = [row]
                else:
                    current_event.append(row)
                    
        if current_event:
            passing_events.append(pd.DataFrame(current_event))
            
        # The actual crossing is the point in the event with the minimum distance to S/F
        crossings = []
        for event_df in passing_events:
            min_dist_idx = event_df['dist_to_sf'].idxmin()
            crossings.append(event_df.loc[min_dist_idx])
            
        # Hysteresis: ensure crossings are separated by min lap duration
        valid_crossings = []
        last_crossing_time = -np.inf
        
        for cross in crossings:
            if (cross['timestamp'] - last_crossing_time) > self.min_lap_duration_sec * 1000:
                valid_crossings.append(cross)
                last_crossing_time = cross['timestamp']
                
        # Build laps
        for i in range(len(valid_crossings) - 1):
            start = valid_crossings[i]
            end = valid_crossings[i+1]
            duration_sec = (end['timestamp'] - start['timestamp']) / 1000.0
            
            laps.append({
                "lap_number": i + 1,
                "start_timestamp": int(start['timestamp']),
                "end_timestamp": int(end['timestamp']),
                "lap_duration_seconds": duration_sec
            })
            
        if not laps and not df.empty:
            logger.info("Synthesizing a single session-wide lap for point-to-point track profile.")
            start = df.iloc[0]
            end = df.iloc[-1]
            duration_sec = (end['timestamp'] - start['timestamp']) / 1000.0
            laps.append({
                "lap_number": 1,
                "start_timestamp": int(start['timestamp']),
                "end_timestamp": int(end['timestamp']),
                "lap_duration_seconds": duration_sec
            })
            
        return laps
