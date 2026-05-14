import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { TelemetryPoint, Segment } from '../../types/telemetry';
import { createTrackProjection, speedToColor } from '../../utils/d3Helpers';
import { ReplayEngine } from '../../engine/ReplayEngine';

interface TrackMapProps {
  telemetry: TelemetryPoint[];
  segments: Segment[];
  engine: ReplayEngine | null;
}

export const TrackMap: React.FC<TrackMapProps> = ({ telemetry, segments, engine }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const projectionRef = useRef<ReturnType<typeof createTrackProjection> | null>(null);
  const trailRef = useRef<SVGPathElement | null>(null);
  const trailPointsRef = useRef<[number, number][]>([]);

  // ── Resize Observer ──
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Draw Static Track ──
  useEffect(() => {
    if (!svgRef.current || telemetry.length === 0 || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Defs for glow filters and gradients
    const defs = svg.append('defs');

    // Glow filter
    const filter = defs.append('filter').attr('id', 'trackGlow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    filter.append('feFlood').attr('flood-color', '#22d3ee').attr('flood-opacity', '0.3').attr('result', 'color');
    filter.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'glow');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Car glow
    const carFilter = defs.append('filter').attr('id', 'carGlow');
    carFilter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
    carFilter.append('feFlood').attr('flood-color', '#fbbf24').attr('flood-opacity', '0.6').attr('result', 'color');
    carFilter.append('feComposite').attr('in', 'color').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow');
    const carMerge = carFilter.append('feMerge');
    carMerge.append('feMergeNode').attr('in', 'glow');
    carMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const proj = createTrackProjection(telemetry, dimensions.width, dimensions.height);
    projectionRef.current = proj;

    const trackLayer = svg.append('g').attr('class', 'track-layer');

    // ── Draw speed-colored track ──
    // Base track (dark, wide)
    const allPoints = telemetry.map(t => proj(t.longitude, t.latitude));
    const lineGen = d3.line<[number, number]>().x(d => d[0]).y(d => d[1]).curve(d3.curveCatmullRom.alpha(0.5));

    trackLayer.append('path')
      .attr('d', lineGen(allPoints)!)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(30, 41, 59, 0.8)')
      .attr('stroke-width', 14)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round');

    // Speed-colored segments (thin, on top)
    const maxSpeed = Math.max(...telemetry.map(t => t.speed_kmh), 1);
    for (let i = 0; i < telemetry.length - 1; i++) {
      const p1 = proj(telemetry[i].longitude, telemetry[i].latitude);
      const p2 = proj(telemetry[i + 1].longitude, telemetry[i + 1].latitude);
      const avgSpd = (telemetry[i].speed_kmh + telemetry[i + 1].speed_kmh) / 2;

      trackLayer.append('line')
        .attr('x1', p1[0]).attr('y1', p1[1])
        .attr('x2', p2[0]).attr('y2', p2[1])
        .attr('stroke', speedToColor(avgSpd, maxSpeed))
        .attr('stroke-width', 4)
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0.85);
    }

    // ── Corner labels ──
    const corners = segments.filter(s => s.segment_type === 'corner');
    corners.forEach(corner => {
      const midTs = (corner.start_timestamp + corner.end_timestamp) / 2;
      const closest = telemetry.reduce((prev, curr) =>
        Math.abs(curr.timestamp - midTs) < Math.abs(prev.timestamp - midTs) ? curr : prev
      );
      const [cx, cy] = proj(closest.longitude, closest.latitude);

      const g = trackLayer.append('g').attr('transform', `translate(${cx}, ${cy - 20})`);
      g.append('rect')
        .attr('x', -20).attr('y', -10)
        .attr('width', 40).attr('height', 20)
        .attr('rx', 4)
        .attr('fill', 'rgba(248, 113, 113, 0.15)')
        .attr('stroke', 'rgba(248, 113, 113, 0.4)')
        .attr('stroke-width', 0.5);
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', '#f87171')
        .attr('font-size', '9px')
        .attr('font-family', "'Inter', sans-serif")
        .attr('font-weight', '600')
        .attr('letter-spacing', '0.05em')
        .text(corner.segment_id);
    });

    // ── Start/Finish marker ──
    if (telemetry.length > 0) {
      const [sx, sy] = proj(telemetry[0].longitude, telemetry[0].latitude);
      trackLayer.append('rect')
        .attr('x', sx - 10).attr('y', sy - 3)
        .attr('width', 20).attr('height', 6)
        .attr('rx', 1)
        .attr('fill', '#22d3ee')
        .attr('opacity', 0.8);

      trackLayer.append('text')
        .attr('x', sx).attr('y', sy - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(34, 211, 238, 0.6)')
        .attr('font-size', '8px')
        .attr('font-family', "'Inter', sans-serif")
        .attr('font-weight', '500')
        .attr('letter-spacing', '0.1em')
        .text('S/F');
    }

    // ── Trail path (for fading car trail) ──
    const trail = svg.append('path')
      .attr('class', 'car-trail')
      .attr('fill', 'none')
      .attr('stroke', '#fbbf24')
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.4);
    trailRef.current = trail.node();
    trailPointsRef.current = [];

    // ── Car marker ──
    const carGroup = svg.append('g').attr('class', 'car-group');

    // Outer pulse ring
    carGroup.append('circle')
      .attr('class', 'car-pulse')
      .attr('r', 16)
      .attr('fill', 'none')
      .attr('stroke', '#fbbf24')
      .attr('stroke-width', 1)
      .attr('opacity', 0.3);

    // Main car dot
    carGroup.append('circle')
      .attr('class', 'car-dot')
      .attr('r', 6)
      .attr('fill', '#fbbf24')
      .attr('filter', 'url(#carGlow)');

    // Inner bright core
    carGroup.append('circle')
      .attr('class', 'car-core')
      .attr('r', 2.5)
      .attr('fill', '#fff');

  }, [telemetry, segments, dimensions]);

  // ── Imperative Car Updates via Engine ──
  useEffect(() => {
    if (!engine || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const lineGen = d3.line<[number, number]>().x(d => d[0]).y(d => d[1]).curve(d3.curveCatmullRom.alpha(0.5));

    const unsubscribe = engine.subscribe((point) => {
      if (!projectionRef.current) return;
      const [x, y] = projectionRef.current(point.longitude, point.latitude);

      // Move car group
      svg.select('.car-group').attr('transform', `translate(${x}, ${y})`);

      // Update trail
      trailPointsRef.current.push([x, y]);
      if (trailPointsRef.current.length > 80) trailPointsRef.current.shift();
      if (trailRef.current && trailPointsRef.current.length > 1) {
        trailRef.current.setAttribute('d', lineGen(trailPointsRef.current)!);
      }
    });

    return unsubscribe;
  }, [engine]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(34,211,238,0.03) 1px, transparent 0)',
        backgroundSize: '40px 40px',
      }} />

      <svg ref={svgRef} width="100%" height="100%" className="relative z-10" />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none z-20" style={{
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(5,10,20,0.6) 100%)',
      }} />
    </div>
  );
};
