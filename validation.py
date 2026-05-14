import pandas as pd
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

def verify_frequency(df: pd.DataFrame, expected_freq_ms: int = 100) -> float:
    """
    Verifies the frequency of the dataframe index and returns the mean difference in milliseconds.
    """
    if len(df) < 2:
        return 0.0
    diffs = df.index.to_series().diff().dt.total_seconds() * 1000
    mean_diff = diffs.mean()
    
    if abs(mean_diff - expected_freq_ms) > 1:
        logger.warning(f"Frequency mismatch: expected {expected_freq_ms}ms, got {mean_diff:.2f}ms")
    else:
        logger.info(f"Frequency verified: {mean_diff:.2f}ms average interval")
        
    return mean_diff

def report_missing_data(df: pd.DataFrame) -> Dict[str, float]:
    """
    Returns a dictionary of column names and the percentage of missing (NaN) values.
    """
    missing = df.isna().sum()
    total = len(df)
    if total == 0:
        return {}
        
    report = (missing / total) * 100
    
    # Log any fields with missing data
    for col, pct in report.items():
        if pct > 0:
            logger.warning(f"Missing data in {col}: {pct:.2f}%")
            
    return report.to_dict()
