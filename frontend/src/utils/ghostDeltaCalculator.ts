import { SpatialSyncResult } from './ghostSpatialSynchronizer';

/**
 * Formats a spatial sync result into HUD-ready display values.
 * This is a lightweight formatter — all heavy computation is done by
 * ghostSpatialSynchronizer.synchronizeGhostSpatially().
 */
export interface GhostDeltaDisplay {
  /** Formatted time delta string (e.g. "+0.42s" or "-0.18s") */
  deltaText: string;
  /** CSS color for the delta display */
  deltaColor: string;
  /** Spatial gap in meters */
  gapMeters: number;
  /** Whether the driver is gaining, losing, or neutral */
  trend: 'gaining' | 'losing' | 'neutral';
  /** Trend indicator character */
  trendIndicator: string;
}

export function formatGhostDelta(
  syncResult: SpatialSyncResult,
  smoothedDeltaMs: number
): GhostDeltaDisplay {
  const deltaS = smoothedDeltaMs / 1000;
  const sign = deltaS >= 0 ? '+' : '';
  const color = deltaS >= 0
    ? 'rgba(248, 113, 113, 0.8)'   // Red = behind (losing)
    : 'rgba(52, 211, 153, 0.8)';   // Green = ahead (gaining)

  const trendIndicator =
    syncResult.trend === 'gaining' ? '▲' :
    syncResult.trend === 'losing' ? '▼' : '—';

  return {
    deltaText: `${sign}${deltaS.toFixed(2)}s`,
    deltaColor: color,
    gapMeters: syncResult.spatialGapM,
    trend: syncResult.trend,
    trendIndicator,
  };
}
