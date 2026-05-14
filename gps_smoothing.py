import pandas as pd
import numpy as np
import logging
from gps_utils import haversine_distance

logger = logging.getLogger(__name__)

def reject_gps_outliers(df: pd.DataFrame, max_speed_kmh: float = 400.0, max_signal_drop_sec: float = 2.0) -> pd.DataFrame:
    """
    Reject single-point teleport spikes and massive off-track signal drops.
    """
    df = df.copy()
    
    dt = df['timestamp'].diff() / 1000.0
    dt = dt.fillna(0.1)
    
    prev_lat = df['latitude'].shift(1).fillna(df['latitude'])
    prev_lon = df['longitude'].shift(1).fillna(df['longitude'])
    prev_speed = df['speed_kmh'].shift(1).fillna(df['speed_kmh'])
    
    dist = haversine_distance(df['latitude'].values, df['longitude'].values, prev_lat.values, prev_lon.values)
    
    implied_speed = (dist / dt) * 3.6
    
    # 1. Standard outlier detection (impossible speeds)
    standard_outliers = (implied_speed > max_speed_kmh) & (dt > 0)
    
    # 2. Signal drop detection
    signal_drops = (dt > max_signal_drop_sec)
    expected_dist = (prev_speed / 3.6) * dt
    
    # Disproportionately large jumps after signal drops
    bad_reacquisitions = signal_drops & (dist > expected_dist * 1.5) & (dist > 20.0)
    
    outliers = standard_outliers | bad_reacquisitions
    outlier_count = standard_outliers.sum()
    signal_drop_count = bad_reacquisitions.sum()
    
    if outlier_count > 0 or signal_drop_count > 0:
        logger.info(f"Rejected {outlier_count} standard GPS outliers and {signal_drop_count} bad re-acquisitions.")
        df.loc[outliers, ['latitude', 'longitude', 'altitude', 'speed_kmh']] = np.nan
        df = df.interpolate(method='linear').bfill().ffill()
        
    df.attrs['outlier_count'] = outlier_count
    df.attrs['signal_drop_corrections'] = signal_drop_count
    return df

def smooth_gps_coordinates(df: pd.DataFrame, window_size: int = 5, max_speed_kmh: float = 400.0, max_signal_drop_sec: float = 2.0) -> pd.DataFrame:
    """
    Apply a rolling average to smooth GPS coordinates and speed,
    reducing jitter before heading analysis.
    """
    df = reject_gps_outliers(df, max_speed_kmh=max_speed_kmh, max_signal_drop_sec=max_signal_drop_sec)
    
    smoothed = df.copy()
    smoothed['latitude'] = smoothed['latitude'].rolling(window=window_size, center=True, min_periods=1).mean()
    smoothed['longitude'] = smoothed['longitude'].rolling(window=window_size, center=True, min_periods=1).mean()
    
    if 'speed_kmh' in smoothed.columns:
        smoothed['speed_kmh'] = smoothed['speed_kmh'].rolling(window=window_size, center=True, min_periods=1).mean()
        
    smoothed.attrs['outlier_count'] = df.attrs.get('outlier_count', 0)
    smoothed.attrs['signal_drop_corrections'] = df.attrs.get('signal_drop_corrections', 0)
    return smoothed
