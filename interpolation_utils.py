import pandas as pd
import logging

logger = logging.getLogger(__name__)

def resample_and_interpolate(df: pd.DataFrame, target_freq: str = '100L') -> pd.DataFrame:
    """
    Resamples a time-indexed dataframe to a target frequency (e.g., '100L' for 100ms / 10Hz)
    and applies linear interpolation to fill missing values.
    """
    if df.empty:
        return df

    # Remove duplicated indices if any
    df = df[~df.index.duplicated(keep='first')]

    logger.info(f"Resampling dataframe to {target_freq} and interpolating...")
    
    # Resample and take the mean for samples falling in the same bin
    resampled = df.resample(target_freq).mean()
    
    # Interpolate linearly for gaps (e.g., GPS is 18Hz, target is 10Hz or vice versa)
    interpolated = resampled.interpolate(method='time')
    
    # Fill remaining NaNs at the beginning/end (if interpolation couldn't reach them)
    interpolated = interpolated.bfill().ffill()
    
    return interpolated
