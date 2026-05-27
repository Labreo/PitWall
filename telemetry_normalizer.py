import json
import logging
from pathlib import Path
from typing import Dict, Any, Tuple
import pandas as pd
import numpy as np

from interpolation_utils import resample_and_interpolate
from smoothing import apply_moving_average
from validation import verify_frequency, report_missing_data

logger = logging.getLogger(__name__)

class TelemetryNormalizer:
    def __init__(self, output_dir: str = "data/processed"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def _parse_raw_streams(self, raw_data: Any) -> Dict[str, pd.DataFrame]:
        """
        Extracts GPS, ACCL, and GYRO into pandas DataFrames.
        """
        streams = {}
        
        # Handle `gopro-utils` gopro2json format (just {"data": [...] })
        if isinstance(raw_data, dict) and "data" in raw_data and isinstance(raw_data["data"], list):
            streams["GPS5"] = raw_data["data"]
        # Handle generic streams if present
        elif isinstance(raw_data, dict):
            for k, v in raw_data.items():
                if k in ["GPS5", "ACCL", "GYRO"]:
                    if isinstance(v, list):
                        streams[k] = v
                    elif isinstance(v, dict) and "samples" in v:
                        streams[k] = v["samples"]
                        
        dfs = {}
        for stream_name, samples in streams.items():
            if not samples:
                continue
                
            df = pd.DataFrame(samples)
            
            # Find timestamp column
            ts_col = None
            for col in ["utc", "timestamp", "time"]:
                if col in df.columns:
                    ts_col = col
                    break
                    
            if ts_col:
                # Convert timestamps (assuming microseconds for gopro utc) to datetime
                # We use origin='unix' assuming UTC epoch in microseconds
                # If they are very small, maybe they are milliseconds or seconds.
                # Heuristic: if ts > 1e14, it's usec. If > 1e11, msec.
                first_ts = df[ts_col].iloc[0]
                if first_ts > 1e14:
                    df['datetime'] = pd.to_datetime(df[ts_col], unit='us')
                elif first_ts > 1e11:
                    df['datetime'] = pd.to_datetime(df[ts_col], unit='ms')
                else:
                    df['datetime'] = pd.to_datetime(df[ts_col], unit='s')
                    
                df.set_index('datetime', inplace=True)
                # Sort index to ensure monotonic
                df.sort_index(inplace=True)
                dfs[stream_name] = df
                
        return dfs

    def normalize(self, raw_json_path: str) -> Tuple[str, Dict[str, Any]]:
        logger.info(f"Normalizing telemetry from {raw_json_path}")
        
        with open(raw_json_path, 'r') as f:
            raw_data = json.load(f)
            
        dfs = self._parse_raw_streams(raw_data)
        
        if "GPS5" not in dfs:
            raise ValueError("No GPS data found in raw telemetry. Normalization requires GPS as the primary timeline.")
            
        gps_df = dfs["GPS5"]
        
        # Base unified dataframe
        unified_df = pd.DataFrame(index=gps_df.index)
        
        # Normalize GPS
        unified_df['latitude'] = gps_df['lat'] if 'lat' in gps_df else np.nan
        unified_df['longitude'] = gps_df['lon'] if 'lon' in gps_df else np.nan
        unified_df['altitude'] = gps_df['alt'] if 'alt' in gps_df else np.nan
        
        # Convert speed from m/s to km/h
        if 'spd' in gps_df:
            unified_df['speed_kmh'] = gps_df['spd'] * 3.6
        else:
            unified_df['speed_kmh'] = np.nan
            
        # Add ACCL and GYRO if available
        # If not available, we fill with zeros to maintain consistent schema
        accl_df = dfs.get("ACCL", pd.DataFrame())
        gyro_df = dfs.get("GYRO", pd.DataFrame())
        
        # We need to merge them. The cleanest way is to just resample the unified timeline 
        # and then map ACCL/GYRO via merge_asof or reindex.
        # But we can just resample everything individually and then merge.
        
        # Step 1: Resample GPS to 10Hz
        unified_df = resample_and_interpolate(unified_df, target_freq='100ms') # 100ms = 10Hz
        
        # Map ACCL
        for ax in ['x', 'y', 'z']:
            col_name = f"accel_{ax}"
            if not accl_df.empty and ax in accl_df.columns:
                resampled_accl = resample_and_interpolate(accl_df[[ax]], target_freq='100ms')
                # Reindex to unified_df index
                unified_df[col_name] = resampled_accl[ax].reindex(unified_df.index, method='nearest')
            else:
                unified_df[col_name] = 0.0
                
        # Map GYRO
        for ax in ['x', 'y', 'z']:
            col_name = f"gyro_{ax}"
            if not gyro_df.empty and ax in gyro_df.columns:
                resampled_gyro = resample_and_interpolate(gyro_df[[ax]], target_freq='100ms')
                unified_df[col_name] = resampled_gyro[ax].reindex(unified_df.index, method='nearest')
            else:
                unified_df[col_name] = 0.0

        # Step 2: Smoothing
        # Light smoothing on speed and coordinates
        unified_df = apply_moving_average(unified_df, window=3)

        # Step 3: Validation
        missing_report = report_missing_data(unified_df)
        mean_diff = verify_frequency(unified_df, expected_freq_ms=100)

        # Finalize structure
        # Convert timestamp index to milliseconds offset from start for the schema
        start_time = unified_df.index[0]
        unified_df['timestamp'] = ((unified_df.index - start_time).total_seconds() * 1000).astype(int)
        
        # Reorder columns to match schema
        cols = ['timestamp', 'latitude', 'longitude', 'altitude', 'speed_kmh', 
                'accel_x', 'accel_y', 'accel_z', 'gyro_x', 'gyro_y', 'gyro_z']
        unified_df = unified_df[cols]

        # Convert to records
        records = unified_df.replace({np.nan: None}).to_dict(orient='records')
        
        output_file = self.output_dir / "normalized_session.json"
        with open(output_file, 'w') as f:
            json.dump(records, f, indent=2)
            
        logger.info(f"Successfully normalized telemetry. Saved to {output_file}")
        
        report = {
            "target_frequency_hz": 10,
            "actual_frequency_ms": mean_diff,
            "total_samples": len(unified_df),
            "missing_data_percentages": missing_report,
            "duration_sec": len(unified_df) * 0.1
        }
        return str(output_file), report
