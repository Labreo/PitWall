import { TelemetryPoint } from '../types/telemetry';
import { TheoreticalSector } from './theoreticalSegmentSelector';

export interface StitchedSectorMapping {
  newStart: number;
  newEnd: number;
  originalStart: number;
  originalEnd: number;
}

export interface StitchedTheoreticalLap {
  telemetry: TelemetryPoint[];
  sectors: TheoreticalSector[];
  totalDurationMs: number;
  mappings: StitchedSectorMapping[];
}

/**
 * Stitches together the telemetry slices from the best segments into a continuous lap.
 */
export const assembleTheoreticalLap = (
  fullTelemetry: TelemetryPoint[],
  bestSectors: TheoreticalSector[]
): StitchedTheoreticalLap => {
  const stitchedTelemetry: TelemetryPoint[] = [];
  const mappings: StitchedSectorMapping[] = [];
  let currentTimeOffset = 0;

  bestSectors.forEach((sector, i) => {
    const { start_timestamp, end_timestamp } = sector.bestSegment;
    
    // Extract slice
    const slice = fullTelemetry.filter(t => t.timestamp >= start_timestamp && t.timestamp <= end_timestamp);
    
    if (slice.length === 0) return;

    const sliceStart = slice[0].timestamp;
    const duration = end_timestamp - start_timestamp;

    // Track mapping for video sync
    mappings.push({
      newStart: currentTimeOffset,
      newEnd: currentTimeOffset + duration,
      originalStart: start_timestamp,
      originalEnd: end_timestamp
    });
    
    // Map slice to new continuous timeline
    const mappedSlice = slice.map(t => ({
      ...t,
      timestamp: currentTimeOffset + (t.timestamp - sliceStart)
    }));

    stitchedTelemetry.push(...mappedSlice);
    
    // Update offset for next sector
    currentTimeOffset += duration;
  });

  return {
    telemetry: stitchedTelemetry,
    sectors: bestSectors,
    totalDurationMs: currentTimeOffset,
    mappings
  };
};
