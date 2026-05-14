import * as d3 from 'd3';
import { TelemetryPoint } from '../types/telemetry';

/**
 * Creates a local equirectangular projection that maps lat/lon to SVG pixel space.
 * Corrects for longitude foreshortening at the track's latitude.
 */
export function createTrackProjection(
  data: TelemetryPoint[],
  width: number,
  height: number,
  padding: number = 60
) {
  const lons = data.map(d => d.longitude);
  const lats = data.map(d => d.latitude);

  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const avgLat = (minLat + maxLat) / 2;
  const cosLat = Math.cos(avgLat * Math.PI / 180);

  const xExt = (maxLon - minLon) * cosLat;
  const yExt = maxLat - minLat;

  const w = width - padding * 2;
  const h = height - padding * 2;

  const aspect = xExt / yExt;
  let scaleX: number, scaleY: number;

  if (w / h > aspect) {
    scaleY = h / yExt;
    scaleX = scaleY * cosLat;
  } else {
    scaleX = w / xExt;
    scaleY = scaleX / cosLat;
  }

  const cx = (minLon + maxLon) / 2;
  const cy = (minLat + maxLat) / 2;

  return (lon: number, lat: number): [number, number] => {
    const x = padding + w / 2 + (lon - cx) * scaleX;
    const y = padding + h / 2 - (lat - cy) * scaleY;
    return [x, y];
  };
}

/**
 * Maps a speed value to a color on the telemetry gradient.
 */
export function speedToColor(speed: number, maxSpeed: number = 200): string {
  const t = Math.min(speed / maxSpeed, 1);
  const scale = d3.scaleLinear<string>()
    .domain([0, 0.3, 0.6, 1])
    .range(['#22d3ee', '#34d399', '#fbbf24', '#f87171']);
  return scale(t);
}
