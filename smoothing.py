import pandas as pd
import logging

logger = logging.getLogger(__name__)

def apply_moving_average(df: pd.DataFrame, window: int = 3, columns: list = None) -> pd.DataFrame:
    """
    Applies a centered moving average to the specified columns (or all columns if None).
    Helps reduce noise in high-frequency sensors like accelerometers or GPS jitter.
    """
    if df.empty:
        return df
        
    if columns is None:
        columns = df.columns.tolist()
        
    logger.info(f"Applying moving average smoothing (window={window}) to {len(columns)} columns...")
    
    # We apply rolling mean, centered, and min_periods=1 to avoid introducing NaNs at edges
    df_smoothed = df.copy()
    df_smoothed[columns] = df_smoothed[columns].rolling(window=window, center=True, min_periods=1).mean()
    
    return df_smoothed
