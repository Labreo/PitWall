import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TelemetryPoint, Segment, Lap } from '../../types/telemetry';
import { createTrackProjection } from '../../utils/d3Helpers';
import { buildGhostLaps, findBestLap } from '../../utils/ghostLapBuilder';
import { buildAllProgressMaps, LapProgressMap } from '../../utils/ghostTrackProgress';
import { synchronizeGhostSpatially } from '../../utils/ghostSpatialSynchronizer';
import { GhostDeltaSmoother } from '../../utils/ghostDeltaSmoother';
import { useReplayStore } from '../../store/replayStore';
import { ReplayEngine } from '../../engine/ReplayEngine';
import { GhostLapData } from '../../utils/ghostTypes';

interface GhostReplayLayerProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  telemetry: TelemetryPoint[];
  segments: Segment[];
  laps: Lap[];
  dimensions: { width: number; height: number };
  engine: ReplayEngine | null;
}

/**
 * GhostReplayLayer — Spatially-synchronized ghost racing overlay.
 *
 * Architecture:
 * - Precomputes cumulative-distance progress maps for ALL laps once
 * - Synchronizes ghost via TRACK POSITION (not time proportion)
 * - Delta = "time difference to reach the same track position"
 * - Uses EMA smoothing to filter GPS noise from delta display
 * - Subscribes to ReplayEngine imperative callback (NOT React state) for 60fps
 */
export const GhostReplayLayer: React.FC<GhostReplayLayerProps> = ({
  svgRef, telemetry, segments, laps, dimensions, engine
}) => {
  // Low-frequency config from store
  const ghostEnabled = useReplayStore(s => s.ghostModeEnabled);
  const ghostSource = useReplayStore(s => s.ghostSource);
  const ghostSelectedLapNum = useReplayStore(s => s.ghostSelectedLap);
  const ghostOffsetMs = useReplayStore(s => s.ghostOffsetMs);
  const ghostShowTrail = useReplayStore(s => s.ghostShowTrail);

  // Precomputed data refs (computed once, never during frames)
  const ghostLapsRef = useRef<Map<number, GhostLapData>>(new Map());
  const progressMapsRef = useRef<Map<number, LapProgressMap>>(new Map());
  const bestLapRef = useRef<Lap | null>(null);
  const initializedRef = useRef(false);

  // One-time precomputation of ALL progress maps
  useEffect(() => {
    if (!telemetry.length || !laps.length) return;
    ghostLapsRef.current = buildGhostLaps(telemetry, laps);
    progressMapsRef.current = buildAllProgressMaps(telemetry, laps);
    bestLapRef.current = findBestLap(laps);
    initializedRef.current = true;
  }, [telemetry, laps]);

  // SVG setup + engine subscription
  useEffect(() => {
    if (!svgRef.current || !engine || !initializedRef.current || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    const layerId = 'ghost-replay-layer';

    // Remove previous layer
    svg.select(`#${layerId}`).remove();

    if (!ghostEnabled) return;

    // Resolve which ghost lap to use
    let activeGhost: GhostLapData | null = null;
    let ghostLapNum: number | null = null;

    if (ghostSource === 'best' && bestLapRef.current) {
      ghostLapNum = bestLapRef.current.lap_number;
      activeGhost = ghostLapsRef.current.get(ghostLapNum) ?? null;
    } else if (ghostSource === 'selected') {
      ghostLapNum = ghostSelectedLapNum;
      activeGhost = ghostLapsRef.current.get(ghostLapNum) ?? null;
    }

    if (!activeGhost || ghostLapNum === null) return;

    const ghostProgressMap = progressMapsRef.current.get(ghostLapNum);
    if (!ghostProgressMap || ghostProgressMap.entries.length < 2) return;

    const proj = createTrackProjection(telemetry, dimensions.width, dimensions.height, 80);

    // ── Build SVG Filter ──
    let defs = svg.select('defs');
    if (defs.empty()) defs = svg.append('defs');

    const filterId = 'ghostShimmer';
    if (defs.select(`#${filterId}`).empty()) {
      const filter = defs.append('filter')
        .attr('id', filterId)
        .attr('x', '-100%').attr('y', '-100%')
        .attr('width', '300%').attr('height', '300%');
      filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'blur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    }

    // ── Build Layer Group ──
    const ghostG = svg.append('g').attr('id', layerId).attr('opacity', 0);

    // Ghost Trail (precomputed full-lap path)
    const lineGen = d3.line<[number, number]>().x(d => d[0]).y(d => d[1]).curve(d3.curveCatmullRom.alpha(0.5));

    // Precompute the full ghost racing line
    const ghostFullPath = activeGhost.telemetry.map(
      pt => proj(pt.longitude, pt.latitude) as [number, number]
    );

    // Static ghost racing line (toggleable)
    if (ghostShowTrail) {
      ghostG.append('path')
        .attr('class', 'ghost-full-line')
        .attr('d', lineGen(ghostFullPath)!)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(148, 163, 184, 0.08)')
        .attr('stroke-width', 3)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round');
    }

    // Dynamic ghost motion trail (recent positions, updated per frame)
    ghostG.append('path')
      .attr('class', 'ghost-motion-trail')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(148, 163, 184, 0.25)')
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('filter', `url(#${filterId})`);

    // Ghost Marker Group
    const ghostMarker = ghostG.append('g').attr('class', 'ghost-marker').attr('opacity', 0);

    // Outer shimmer ring
    ghostMarker.append('circle')
      .attr('r', 14)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(148, 163, 184, 0.15)')
      .attr('stroke-width', 1);

    // Ghost body
    ghostMarker.append('circle')
      .attr('r', 5)
      .attr('fill', 'rgba(203, 213, 225, 0.6)')
      .attr('filter', `url(#${filterId})`);

    // Ghost core
    ghostMarker.append('circle')
      .attr('r', 2)
      .attr('fill', 'rgba(255, 255, 255, 0.8)');

    // Delta indicator text
    ghostG.append('text')
      .attr('class', 'ghost-delta-text')
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(52, 211, 153, 0.8)')
      .attr('font-size', '9px')
      .attr('font-family', "'Inter', monospace")
      .attr('font-weight', '600')
      .attr('letter-spacing', '0.05em')
      .attr('opacity', 0);

    // Cinematic fade in
    ghostG.transition().duration(1200).ease(d3.easeCubicOut).attr('opacity', 1);

    // ── Pre-cache DOM elements for hot path ──
    const ghostMarkerEl = ghostG.select('.ghost-marker').node() as SVGGElement;
    const ghostMotionTrailEl = ghostG.select('.ghost-motion-trail').node() as SVGPathElement;
    const ghostDeltaEl = ghostG.select('.ghost-delta-text').node() as SVGTextElement;

    // Mutable state for the 60fps loop (NOT React state)
    const liveSpatialIdx = { value: 0 };
    const ghostSpatialIdx = { value: 0 };
    const trailPoints: [number, number][] = [];
    const deltaSmoother = new GhostDeltaSmoother(0.12);
    let prevLapNum: number | null = null;

    // ── Subscribe to ReplayEngine (60fps imperative updates) ──
    const unsub = engine.subscribe((currentPt) => {
      if (!proj) return;

      const store = useReplayStore.getState();
      const currentLapNum = store.currentLapNumber;

      // Only show ghost from lap 2 onward (need a benchmark to compare against)
      if (!currentLapNum || currentLapNum < 2) {
        ghostMarkerEl.setAttribute('opacity', '0');
        ghostDeltaEl.setAttribute('opacity', '0');
        return;
      }

      // Reset spatial indices when crossing a lap boundary
      if (currentLapNum !== prevLapNum) {
        liveSpatialIdx.value = 0;
        ghostSpatialIdx.value = 0;
        trailPoints.length = 0;
        deltaSmoother.reset();
        prevLapNum = currentLapNum;
      }

      // Get the LIVE lap's progress map
      const liveProgressMap = progressMapsRef.current.get(currentLapNum);
      if (!liveProgressMap || liveProgressMap.entries.length < 2) {
        ghostMarkerEl.setAttribute('opacity', '0');
        return;
      }

      // ── SPATIAL SYNCHRONIZATION ──
      const syncResult = synchronizeGhostSpatially(
        currentPt.latitude,
        currentPt.longitude,
        store.currentTimestamp,
        currentPt.speed_kmh,
        liveProgressMap,
        ghostProgressMap,
        liveSpatialIdx,
        ghostSpatialIdx,
        ghostOffsetMs
      );

      if (!syncResult) {
        ghostMarkerEl.setAttribute('opacity', '0');
        return;
      }

      // Project ghost position to screen
      const [gx, gy] = proj(syncResult.ghostLon, syncResult.ghostLat) as [number, number];

      // Move ghost marker
      ghostMarkerEl.setAttribute('opacity', '1');
      ghostMarkerEl.setAttribute('transform', `translate(${gx},${gy})`);

      // Update motion trail
      trailPoints.push([gx, gy]);
      while (trailPoints.length > 40) trailPoints.shift();

      if (ghostMotionTrailEl && trailPoints.length > 1) {
        ghostMotionTrailEl.setAttribute('d', lineGen(trailPoints)!);
      }

      // ── SMOOTHED DELTA DISPLAY ──
      const smoothedDeltaMs = deltaSmoother.update(syncResult.deltaMs);
      const deltaS = smoothedDeltaMs / 1000;
      const deltaSign = deltaS >= 0 ? '+' : '';
      const deltaColor = deltaS >= 0 ? 'rgba(248,113,113,0.8)' : 'rgba(52,211,153,0.8)';

      ghostDeltaEl.setAttribute('opacity', '1');
      ghostDeltaEl.setAttribute('x', gx.toString());
      ghostDeltaEl.setAttribute('y', (gy - 20).toString());
      ghostDeltaEl.setAttribute('fill', deltaColor);
      ghostDeltaEl.textContent = `${deltaSign}${deltaS.toFixed(2)}s`;
    });

    return () => {
      unsub();
      svg.select(`#${layerId}`).transition().duration(500).attr('opacity', 0).remove();
    };
  }, [svgRef, engine, telemetry, laps, dimensions, ghostEnabled, ghostSource, ghostSelectedLapNum, ghostOffsetMs, ghostShowTrail]);

  return null;
};
