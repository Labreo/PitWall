import { TelemetryPoint, Lap } from '../types/telemetry';

/**
 * A precomputed distance-indexed representation of a lap's telemetry.
 * Each entry maps cumulative distance → timestamp + position,
 * enabling O(1) lookup of "where was the car at distance X along the track."
 */
export interface TrackProgressEntry {
  /** Cumulative distance from lap start in meters */
  distance: number;
  /** Normalized progress 0.0 → 1.0 */
  progress: number;
  /** Original timestamp */
  timestamp: number;
  /** Position */
  latitude: number;
  longitude: number;
  /** Speed at this point */
  speed_kmh: number;
  /** Index into the source telemetry array */
  sourceIndex: number;
}

export interface LapProgressMap {
  lapNumber: number;
  entries: TrackProgressEntry[];
  totalDistance: number;
}

/**
 * Computes the great-circle distance between two GPS coordinates in meters.
 * Uses the haversine-like flat-Earth approximation (accurate enough for <1km segments).
 */
function gpsDistanceMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const dLat = (lat2 - lat1) * 111000;
  const dLon = (lon2 - lon1) * 111000 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

/**
 * Builds a cumulative-distance-indexed progress map for a single lap.
 * This is the spatial "spine" against which both live and ghost positions
 * are compared — enabling true motorsport delta computation.
 *
 * Precomputed once. O(N) where N = telemetry points in the lap.
 */
export function buildLapProgressMap(
  telemetry: TelemetryPoint[],
  lap: Lap,
  lapIndex: number
): LapProgressMap {
  const slice = telemetry.filter(
    t => t.timestamp >= lap.start_timestamp && t.timestamp <= lap.end_timestamp
  );

  if (slice.length < 2) {
    return { lapNumber: lap.lap_number, entries: [], totalDistance: 0 };
  }

  const entries: TrackProgressEntry[] = [];
  let cumDist = 0;

  // First point
  entries.push({
    distance: 0,
    progress: 0,
    timestamp: slice[0].timestamp,
    latitude: slice[0].latitude,
    longitude: slice[0].longitude,
    speed_kmh: slice[0].speed_kmh,
    sourceIndex: 0,
  });

  for (let i = 1; i < slice.length; i++) {
    const prev = slice[i - 1];
    const curr = slice[i];
    const segDist = gpsDistanceMeters(prev.latitude, prev.longitude, curr.latitude, curr.longitude);

    // Filter GPS jitter: skip segments < 0.05m (stationary GPS noise)
    if (segDist < 0.05 && curr.speed_kmh < 1) continue;

    cumDist += segDist;
    entries.push({
      distance: cumDist,
      progress: 0, // Will be normalized after total is known
      timestamp: curr.timestamp,
      latitude: curr.latitude,
      longitude: curr.longitude,
      speed_kmh: curr.speed_kmh,
      sourceIndex: i,
    });
  }

  // Normalize progress
  const totalDistance = cumDist;
  if (totalDistance > 0) {
    for (const entry of entries) {
      entry.progress = entry.distance / totalDistance;
    }
  }

  return { lapNumber: lap.lap_number, entries, totalDistance };
}

/**
 * Builds progress maps for ALL laps in the session.
 * Called once at initialization.
 */
export function buildAllProgressMaps(
  telemetry: TelemetryPoint[],
  laps: Lap[]
): Map<number, LapProgressMap> {
  const maps = new Map<number, LapProgressMap>();
  laps.forEach((lap, i) => {
    maps.set(lap.lap_number, buildLapProgressMap(telemetry, lap, i));
  });
  return maps;
}

/**
 * Given a GPS position from the live car, find the closest matching
 * spatial progress value on a reference lap's progress map.
 *
 * Uses a cached index for amortized O(1) sequential lookups during replay.
 *
 * Returns: { progress, matchedEntry, distanceFromTrack }
 */
export function findSpatialProgress(
  lat: number, lon: number,
  progressMap: LapProgressMap,
  cachedIndex: { value: number }
): { progress: number; matchedEntry: TrackProgressEntry; distanceFromTrack: number } | null {
  const entries = progressMap.entries;
  if (entries.length < 2) return null;

  // Scan forward from cached index (amortized O(1) for sequential access)
  let bestIdx = cachedIndex.value;
  let bestDist = Infinity;

  // Search a window around the cached position (±50 entries)
  const searchStart = Math.max(0, cachedIndex.value - 10);
  const searchEnd = Math.min(entries.length - 1, cachedIndex.value + 50);

  for (let i = searchStart; i <= searchEnd; i++) {
    const d = gpsDistanceMeters(lat, lon, entries[i].latitude, entries[i].longitude);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }

  // If the best match is at the edge of our window, do a wider search
  if (bestIdx === searchEnd && searchEnd < entries.length - 1) {
    for (let i = searchEnd + 1; i < Math.min(entries.length, searchEnd + 100); i++) {
      const d = gpsDistanceMeters(lat, lon, entries[i].latitude, entries[i].longitude);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      } else if (d > bestDist * 2) {
        break; // Moving away, stop searching
      }
    }
  }

  cachedIndex.value = bestIdx;

  return {
    progress: entries[bestIdx].progress,
    matchedEntry: entries[bestIdx],
    distanceFromTrack: bestDist,
  };
}
