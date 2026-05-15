import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TelemetryPoint, Segment } from '../../types/telemetry';
import { createTrackProjection } from '../../utils/d3Helpers';
import { useReplayStore } from '../../store/replayStore';

interface CornerIntelligenceLayerProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  telemetry: TelemetryPoint[];
  segments: Segment[];
  dimensions: { width: number; height: number };
  onAnalyticsReady?: (analytics: CornerAnalytics[]) => void;
}

export interface CornerAnalytics {
  segment: Segment;
  entrySpeed: number;
  minSpeed: number;
  exitSpeed: number;
  brakingStartTs: number;
  apexTs: number;
  entryPt: [number, number];
  apexPt: [number, number];
  exitPt: [number, number];
  brakingPt: [number, number];
  trackPts: [number, number][];
  /** positive = time lost vs theoretical minimum */
  timeDelta: number;
}

export function computeCornerAnalytics(
  telemetry: TelemetryPoint[],
  segments: Segment[],
  proj: ReturnType<typeof createTrackProjection>
): CornerAnalytics[] {
  const corners = segments.filter(s => s.segment_type === 'corner');

  return corners.map(seg => {
    // Slice telemetry for this segment + 200ms pre-buffer for braking detection
    const preBuffer = 200;
    const pts = telemetry.filter(
      t => t.timestamp >= seg.start_timestamp - preBuffer && t.timestamp <= seg.end_timestamp
    );
    const segPts = telemetry.filter(
      t => t.timestamp >= seg.start_timestamp && t.timestamp <= seg.end_timestamp
    );

    // Guard: skip segments with no matching telemetry
    if (segPts.length === 0) {
      const fallbackPt = telemetry[0];
      const fp = proj(fallbackPt.longitude, fallbackPt.latitude) as [number, number];
      return {
        segment: seg,
        entrySpeed: seg.average_speed,
        minSpeed: seg.average_speed,
        exitSpeed: seg.average_speed,
        brakingStartTs: seg.start_timestamp,
        apexTs: (seg.start_timestamp + seg.end_timestamp) / 2,
        entryPt: fp, apexPt: fp, exitPt: fp, brakingPt: fp,
        trackPts: [],
        timeDelta: 0,
      } as CornerAnalytics;
    }

    const speeds = segPts.map(t => t.speed_kmh);
    const entrySpeed = speeds[0] ?? seg.average_speed;
    const minSpeed = speeds.length > 0 ? Math.min(...speeds) : seg.average_speed;
    const exitSpeed = speeds[speeds.length - 1] ?? seg.average_speed;
    const minSpeedIdx = speeds.indexOf(minSpeed);

    // Apex = point of minimum speed within segment
    const apexTp = segPts[minSpeedIdx] ?? segPts[Math.floor(segPts.length / 2)];
    const apexTs = apexTp?.timestamp ?? (seg.start_timestamp + seg.end_timestamp) / 2;

    // Braking zone start = last point before segment where speed is still > entrySpeed * 0.95
    let brakingStartTs = seg.start_timestamp;
    for (let i = pts.length - 1; i >= 0; i--) {
      if (pts[i].timestamp < seg.start_timestamp && pts[i].speed_kmh > entrySpeed * 1.02) {
        brakingStartTs = pts[i].timestamp;
        break;
      }
    }

    // Project key points
    const entryTp = segPts[0] ?? apexTp;
    const exitTp = segPts[segPts.length - 1] ?? apexTp;
    const brakingTp = telemetry.find(t => t.timestamp >= brakingStartTs) ?? entryTp;

    const trackPts = segPts.map(t => proj(t.longitude, t.latitude) as [number, number]);

    // Time delta estimate
    const actualDuration = seg.duration_seconds;
    const theoreticalDuration = seg.average_speed > 0 
      ? actualDuration * (minSpeed / seg.average_speed) 
      : actualDuration;
    const timeDelta = actualDuration - theoreticalDuration;

    return {
      segment: seg,
      entrySpeed,
      minSpeed,
      exitSpeed,
      brakingStartTs,
      apexTs,
      entryPt: proj(entryTp.longitude, entryTp.latitude) as [number, number],
      apexPt: proj(apexTp.longitude, apexTp.latitude) as [number, number],
      exitPt: proj(exitTp.longitude, exitTp.latitude) as [number, number],
      brakingPt: proj(brakingTp.longitude, brakingTp.latitude) as [number, number],
      trackPts,
      timeDelta,
    };
  });
}

export function CornerIntelligenceLayer({
  svgRef,
  telemetry,
  segments,
  dimensions,
  onAnalyticsReady,
}: CornerIntelligenceLayerProps) {
  const analyticsRef = useRef<CornerAnalytics[]>([]);
  const layerRef = useRef<SVGGElement | null>(null);
  // Map segment_id → DOM group element for fast imperative lookup
  const cornerEls = useRef<Map<string, SVGGElement>>(new Map());
  const activeIdRef = useRef<string | null>(null);

  // Draw all corner elements once when telemetry/dimensions change
  useEffect(() => {
    if (!svgRef.current || telemetry.length === 0 || dimensions.width === 0) return;

    const proj = createTrackProjection(telemetry, dimensions.width, dimensions.height, 80);
    const analytics = computeCornerAnalytics(telemetry, segments, proj);
    analyticsRef.current = analytics;
    onAnalyticsReady?.(analytics);

    const svg = d3.select(svgRef.current);

    // Remove previous layer
    svg.select('.corner-intelligence-layer').remove();
    cornerEls.current.clear();

    const layer = svg.append('g').attr('class', 'corner-intelligence-layer');
    layerRef.current = layer.node();

    const lineGen = d3.line<[number, number]>().x(d => d[0]).y(d => d[1]).curve(d3.curveCatmullRom.alpha(0.5));

    analytics.forEach(ca => {
      const g = layer.append('g')
        .attr('class', `corner-group corner-inactive`)
        .attr('data-segment', ca.segment.segment_id);

      cornerEls.current.set(ca.segment.segment_id, g.node()!);

      // ── Corner highlight path (glows when active) ──
      if (ca.trackPts.length > 1) {
        g.append('path')
          .attr('class', 'corner-highlight-path')
          .attr('d', lineGen(ca.trackPts)!)
          .attr('fill', 'none')
          .attr('stroke', '#f87171')
          .attr('stroke-width', 6)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round')
          .attr('opacity', 0);
      }

      // ── Braking zone indicator: dashed line from braking point to entry ──
      const brakingDist = Math.hypot(
        ca.brakingPt[0] - ca.entryPt[0],
        ca.brakingPt[1] - ca.entryPt[1]
      );
      if (brakingDist > 4) {
        g.append('line')
          .attr('class', 'corner-braking-line')
          .attr('x1', ca.brakingPt[0]).attr('y1', ca.brakingPt[1])
          .attr('x2', ca.entryPt[0]).attr('y2', ca.entryPt[1])
          .attr('stroke', '#fbbf24')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '3,3')
          .attr('stroke-linecap', 'round')
          .attr('opacity', 0);

        // Braking zone label
        const midX = (ca.brakingPt[0] + ca.entryPt[0]) / 2;
        const midY = (ca.brakingPt[1] + ca.entryPt[1]) / 2 - 8;
        g.append('text')
          .attr('class', 'corner-braking-label')
          .attr('x', midX).attr('y', midY)
          .attr('text-anchor', 'middle')
          .attr('fill', 'rgba(251,191,36,0.7)')
          .attr('font-size', '7px')
          .attr('font-family', "'JetBrains Mono', monospace")
          .attr('font-weight', '600')
          .attr('letter-spacing', '0.08em')
          .text('BRAKE')
          .attr('opacity', 0);
      }

      // ── Apex marker: diamond shape ──
      const [ax, ay] = ca.apexPt;
      const apexG = g.append('g')
        .attr('class', 'corner-apex-group')
        .attr('transform', `translate(${ax},${ay})`)
        .attr('opacity', 0);

      // Outer pulse ring
      apexG.append('circle')
        .attr('class', 'corner-apex-ring')
        .attr('r', 10)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(52,211,153,0.4)')
        .attr('stroke-width', 1);

      // Diamond
      apexG.append('polygon')
        .attr('points', '0,-5 4,0 0,5 -4,0')
        .attr('fill', '#34d399')
        .attr('stroke', 'rgba(2,4,8,0.8)')
        .attr('stroke-width', 1.5);

      // Apex label
      apexG.append('text')
        .attr('x', 0).attr('y', -13)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(52,211,153,0.8)')
        .attr('font-size', '7px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('font-weight', '700')
        .attr('letter-spacing', '0.1em')
        .text('APEX');

      // Entry speed tag
      const [ex, ey] = ca.entryPt;
      g.append('text')
        .attr('class', 'corner-entry-speed')
        .attr('x', ex).attr('y', ey - 12)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(251,191,36,0.9)')
        .attr('font-size', '8px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('font-weight', '700')
        .text(`${Math.round(ca.entrySpeed)}`)
        .attr('opacity', 0);

      // Exit speed tag
      const [exitX, exitY] = ca.exitPt;
      g.append('text')
        .attr('class', 'corner-exit-speed')
        .attr('x', exitX).attr('y', exitY - 12)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(52,211,153,0.9)')
        .attr('font-size', '8px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('font-weight', '700')
        .text(`${Math.round(ca.exitSpeed)}`)
        .attr('opacity', 0);

      // Corner ID tag (always visible, dims when inactive)
      const midIdx = Math.floor(ca.trackPts.length / 2);
      const [labelX, labelY] = ca.trackPts[midIdx] ?? ca.apexPt;
      g.append('text')
        .attr('class', 'corner-id-label')
        .attr('x', labelX).attr('y', labelY - 18)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(248,113,113,0.25)')
        .attr('font-size', '7px')
        .attr('font-family', "'Inter', sans-serif")
        .attr('font-weight', '700')
        .attr('letter-spacing', '0.15em')
        .text(ca.segment.segment_id);
    });
  }, [telemetry, segments, dimensions, svgRef, onAnalyticsReady]);

  // Imperative activation — subscribe to store, no React re-renders
  useEffect(() => {
    const unsub = useReplayStore.subscribe((state) => {
      const newId = state.currentSegmentId;
      if (newId === activeIdRef.current) return;

      // Deactivate previous
      if (activeIdRef.current) {
        const prevEl = cornerEls.current.get(activeIdRef.current);
        if (prevEl) deactivateCorner(prevEl);
      }

      // Activate new (only corners)
      if (newId) {
        const el = cornerEls.current.get(newId);
        if (el) {
          // Check it's actually a corner (analytics entry exists)
          const ca = analyticsRef.current.find(a => a.segment.segment_id === newId);
          if (ca) activateCorner(el);
        }
      }

      activeIdRef.current = newId;
    });
    return unsub;
  }, []);

  return null; // Renders directly into the shared SVG via D3
}

function activateCorner(el: SVGGElement) {
  el.classList.remove('corner-inactive');
  el.classList.add('corner-active');

  const highlight = el.querySelector('.corner-highlight-path') as SVGPathElement | null;
  const brakingLine = el.querySelector('.corner-braking-line') as SVGLineElement | null;
  const brakingLabel = el.querySelector('.corner-braking-label') as SVGTextElement | null;
  const apexGroup = el.querySelector('.corner-apex-group') as SVGGElement | null;
  const entrySpeed = el.querySelector('.corner-entry-speed') as SVGTextElement | null;
  const exitSpeed = el.querySelector('.corner-exit-speed') as SVGTextElement | null;
  const idLabel = el.querySelector('.corner-id-label') as SVGTextElement | null;

  // Staggered fade-in
  fadeIn(highlight, 0, 0.7);
  fadeIn(brakingLine, 80, 0.8);
  fadeIn(brakingLabel, 120, 0.7);
  fadeIn(apexGroup, 160, 1.0);
  fadeIn(entrySpeed, 60, 0.9);
  fadeIn(exitSpeed, 100, 0.9);
  if (idLabel) idLabel.setAttribute('fill', 'rgba(248,113,113,0.8)');
}

function deactivateCorner(el: SVGGElement) {
  el.classList.remove('corner-active');
  el.classList.add('corner-inactive');

  const all = el.querySelectorAll(
    '.corner-highlight-path, .corner-braking-line, .corner-braking-label, .corner-apex-group, .corner-entry-speed, .corner-exit-speed'
  );
  all.forEach(node => fadeOut(node as SVGElement, 0));

  const idLabel = el.querySelector('.corner-id-label') as SVGTextElement | null;
  if (idLabel) idLabel.setAttribute('fill', 'rgba(248,113,113,0.25)');
}

// Tiny imperative tweens — no d3.transition overhead on hot path
function fadeIn(el: SVGElement | null, delayMs: number, targetOpacity: number) {
  if (!el) return;
  const element = el;
  const start = performance.now() + delayMs;
  const duration = 220;
  function tick(now: number) {
    if (now < start) { requestAnimationFrame(tick); return; }
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out
    element.setAttribute('opacity', (ease * targetOpacity).toString());
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function fadeOut(el: SVGElement | null, delayMs: number) {
  if (!el) return;
  const element = el;
  const startOpacity = parseFloat(element.getAttribute('opacity') ?? '0');
  if (startOpacity === 0) return;
  const start = performance.now() + delayMs;
  const duration = 300;
  function tick(now: number) {
    if (now < start) { requestAnimationFrame(tick); return; }
    const t = Math.min((now - start) / duration, 1);
    const ease = t * t; // quadratic ease-in
    element.setAttribute('opacity', (startOpacity * (1 - ease)).toString());
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
