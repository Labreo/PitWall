import pandas as pd
import numpy as np
import logging
import json
from gps_smoothing import smooth_gps_coordinates
from heading_analysis import compute_heading_kinematics
from segment_classifier import classify_segment

logger = logging.getLogger(__name__)

class CornerSegmenterConfig:
    def __init__(self, 
                 heading_rate_threshold=5.0, 
                 hysteresis_duration_sec=0.5, 
                 min_fragment_duration_sec=1.5,
                 max_gap_to_merge_sec=1.5,
                 gps_outlier_max_speed_kmh=400.0,
                 max_signal_drop_sec=2.0):
        self.heading_rate_threshold = heading_rate_threshold
        self.hysteresis_duration_sec = hysteresis_duration_sec
        self.min_fragment_duration_sec = min_fragment_duration_sec
        self.max_gap_to_merge_sec = max_gap_to_merge_sec
        self.gps_outlier_max_speed_kmh = gps_outlier_max_speed_kmh
        self.max_signal_drop_sec = max_signal_drop_sec

class CornerSegmenter:
    def __init__(self, config=None):
        self.config = config or CornerSegmenterConfig()
        self.debug_stats = {
            "outlier_rejection_count": 0,
            "signal_drop_corrections": 0,
            "merged_fragment_count": 0
        }

    def segment_track(self, df: pd.DataFrame):
        logger.info("Smoothing GPS coordinates...")
        df = smooth_gps_coordinates(df, window_size=5, 
                                    max_speed_kmh=self.config.gps_outlier_max_speed_kmh,
                                    max_signal_drop_sec=self.config.max_signal_drop_sec)
        self.debug_stats["outlier_rejection_count"] = int(df.attrs.get('outlier_count', 0))
        self.debug_stats["signal_drop_corrections"] = int(df.attrs.get('signal_drop_corrections', 0))
        
        logger.info("Computing heading kinematics...")
        df = compute_heading_kinematics(df, dt_sec=0.1)
        
        # Base classification
        base_is_corner = np.abs(df['heading_rate']) > self.config.heading_rate_threshold
        
        # Hysteresis: Dilate corner state to bridge brief dips below threshold
        hysteresis_samples = int(self.config.hysteresis_duration_sec * 10)
        # Using rolling max allows the corner state to persist briefly
        is_corner_dilated = base_is_corner.rolling(window=hysteresis_samples, center=False, min_periods=1).max().astype(bool)
        
        df['is_corner'] = is_corner_dilated
        df['segment_id'] = (df['is_corner'] != df['is_corner'].shift(1)).cumsum()
        
        segments = []
        for seg_id, group in df.groupby('segment_id'):
            start_time = group['timestamp'].iloc[0]
            end_time = group['timestamp'].iloc[-1]
            duration = (end_time - start_time) / 1000.0
            is_corner = group['is_corner'].iloc[0]
            
            path = group[['latitude', 'longitude']].to_dict('records')
            net_change = group['heading_rate'].sum() * 0.1
            avg_speed = group['speed_kmh'].mean()
            
            segments.append({
                "segment_type": "corner" if is_corner else "straight",
                "start_timestamp": int(start_time),
                "end_timestamp": int(end_time),
                "duration_seconds": duration,
                "average_speed": avg_speed,
                "heading_change_degrees": net_change,
                "gps_path": path,
                "confidence_score": 1.0
            })
            
        logger.info(f"Initial segmentation: {len(segments)} segments.")
        
        segments = self._merge_fragments(segments)
        
        # Assign IDs, score, and class
        for i, seg in enumerate(segments):
            seg['segment_id'] = f"S{i+1}"
            dur = seg['duration_seconds']
            
            if seg['segment_type'] == 'corner':
                seg['confidence_score'] = round(min(1.0, dur / 3.0), 2)
                seg['classification'] = classify_segment(seg)
            else:
                seg['confidence_score'] = round(min(1.0, dur / 5.0), 2)
                seg['classification'] = "Straight"
                
        logger.info(f"Final segmentation: {len(segments)} segments. Merged {self.debug_stats['merged_fragment_count']} times.")
        
        # Save debug
        with open("data/processed/segmentation_debug.json", "w") as f:
            json.dump(self.debug_stats, f, indent=2)
            
        return segments

    def _merge_fragments(self, segments):
        if not segments:
            return []
            
        merged = [segments[0]]
        for curr in segments[1:]:
            prev = merged[-1]
            
            # 1. Identical types
            if prev['segment_type'] == curr['segment_type']:
                merged[-1] = self._combine_segments(prev, curr)
                self.debug_stats["merged_fragment_count"] += 1
                
            # 2. Too short fragments
            elif prev['duration_seconds'] < self.config.min_fragment_duration_sec:
                merged[-1] = self._combine_segments(prev, curr, force_type=curr['segment_type'])
                self.debug_stats["merged_fragment_count"] += 1
            elif curr['duration_seconds'] < self.config.min_fragment_duration_sec:
                merged[-1] = self._combine_segments(prev, curr, force_type=prev['segment_type'])
                self.debug_stats["merged_fragment_count"] += 1
                
            # 3. Micro-gaps between corners (chicanes)
            elif prev['segment_type'] == 'straight' and curr['segment_type'] == 'corner':
                if len(merged) >= 2 and merged[-2]['segment_type'] == 'corner':
                    if prev['duration_seconds'] < self.config.max_gap_to_merge_sec:
                        big_corner = self._combine_segments(merged[-2], prev, force_type='corner')
                        big_corner = self._combine_segments(big_corner, curr, force_type='corner')
                        merged.pop()
                        merged[-1] = big_corner
                        self.debug_stats["merged_fragment_count"] += 2
                    else:
                        merged.append(curr)
                else:
                    merged.append(curr)
            else:
                merged.append(curr)
                
        # Final cleanup pass
        final_merged = [merged[0]]
        for curr in merged[1:]:
            prev = final_merged[-1]
            if prev['segment_type'] == curr['segment_type']:
                final_merged[-1] = self._combine_segments(prev, curr)
            else:
                final_merged.append(curr)
                
        return final_merged
        
    def _combine_segments(self, s1, s2, force_type=None):
        tot = s1['duration_seconds'] + s2['duration_seconds']
        avg_spd = (s1['average_speed'] * s1['duration_seconds'] + s2['average_speed'] * s2['duration_seconds']) / tot if tot > 0 else 0
        return {
            "segment_type": force_type if force_type else s1['segment_type'],
            "start_timestamp": s1['start_timestamp'],
            "end_timestamp": s2['end_timestamp'],
            "duration_seconds": tot,
            "average_speed": avg_spd,
            "heading_change_degrees": s1['heading_change_degrees'] + s2['heading_change_degrees'],
            "gps_path": s1['gps_path'] + s2['gps_path'],
            "confidence_score": 1.0
        }
