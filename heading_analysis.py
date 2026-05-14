import pandas as pd
import numpy as np
from gps_utils import calculate_heading

def signed_heading_difference(h1, h2):
    """
    Calculate the shortest signed difference between two headings.
    Positive means turning right, negative means turning left.
    """
    diff = (h2 - h1 + 180) % 360 - 180
    return diff

def compute_heading_kinematics(df: pd.DataFrame, dt_sec: float = 0.1) -> pd.DataFrame:
    """
    Compute heading and heading change rate for consecutive points.
    """
    df = df.copy()
    
    # Next coordinates for heading calculation
    next_lat = df['latitude'].shift(-1).fillna(df['latitude'])
    next_lon = df['longitude'].shift(-1).fillna(df['longitude'])
    
    # Calculate instantaneous heading
    df['heading'] = calculate_heading(
        df['latitude'].values, df['longitude'].values,
        next_lat.values, next_lon.values
    )
    
    # Calculate difference between current heading and previous heading
    prev_heading = df['heading'].shift(1).fillna(df['heading'])
    
    # Vectorized signed difference
    h_diffs = np.array([signed_heading_difference(h1, h2) for h1, h2 in zip(prev_heading, df['heading'])])
    
    # Rate of change (degrees per second)
    df['heading_rate'] = h_diffs / dt_sec
    
    # Smooth the rate of change to remove micro-spikes
    df['heading_rate'] = df['heading_rate'].rolling(window=5, center=True, min_periods=1).mean()
    
    return df
