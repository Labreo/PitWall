import React, { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) setDimensions({ width: e.contentRect.width, height: e.contentRect.height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Draw Track ──
  useEffect(() => {
    if (!svgRef.current || telemetry.length === 0 || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');

    // Car glow
    const carF = defs.append('filter').attr('id', 'carBloom').attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%');
    carF.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur');
    carF.append('feFlood').attr('flood-color', '#fbbf24').attr('flood-opacity', '0.5').attr('result', 'c');
    carF.append('feComposite').attr('in', 'c').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow');
    const cm = carF.append('feMerge');
    cm.append('feMergeNode').attr('in', 'glow');
    cm.append('feMergeNode').attr('in', 'SourceGraphic');

    // Track glow
    const tF = defs.append('filter').attr('id', 'trackBloom').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    tF.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'blur');
    const tm = tF.append('feMerge');
    tm.append('feMergeNode').attr('in', 'blur');
    tm.append('feMergeNode').attr('in', 'SourceGraphic');

    const proj = createTrackProjection(telemetry, dimensions.width, dimensions.height, 80);
    projectionRef.current = proj;

    const trackG = svg.append('g').attr('class', 'track');
    const lineGen = d3.line<[number, number]>().x(d => d[0]).y(d => d[1]).curve(d3.curveCatmullRom.alpha(0.5));
    const allPts = telemetry.map(t => proj(t.longitude, t.latitude) as [number, number]);

    // Shadow track (wide, dark)
    trackG.append('path')
      .attr('d', lineGen(allPts)!)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(15, 23, 42, 0.9)')
      .attr('stroke-width', 18)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round');

    // Track outline (subtle border)
    trackG.append('path')
      .attr('d', lineGen(allPts)!)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(34, 211, 238, 0.04)')
      .attr('stroke-width', 20)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round');

    // Speed gradient — individual segments
    const maxSpd = Math.max(...telemetry.map(t => t.speed_kmh), 1);
    for (let i = 0; i < telemetry.length - 1; i++) {
      const p1 = proj(telemetry[i].longitude, telemetry[i].latitude);
      const p2 = proj(telemetry[i + 1].longitude, telemetry[i + 1].latitude);
      const avg = (telemetry[i].speed_kmh + telemetry[i + 1].speed_kmh) / 2;
      trackG.append('line')
        .attr('x1', p1[0]).attr('y1', p1[1])
        .attr('x2', p2[0]).attr('y2', p2[1])
        .attr('stroke', speedToColor(avg, maxSpd))
        .attr('stroke-width', 5)
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0.75)
        .attr('filter', 'url(#trackBloom)');
    }

    // Corner sector markers — thin ticks
    segments.filter(s => s.segment_type === 'corner').forEach(corner => {
      const midTs = (corner.start_timestamp + corner.end_timestamp) / 2;
      const closest = telemetry.reduce((prev, curr) =>
        Math.abs(curr.timestamp - midTs) < Math.abs(prev.timestamp - midTs) ? curr : prev
      );
      const [cx, cy] = proj(closest.longitude, closest.latitude);

      trackG.append('text')
        .attr('x', cx).attr('y', cy - 16)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(248, 113, 113, 0.35)')
        .attr('font-size', '8px')
        .attr('font-family', "'Inter', sans-serif")
        .attr('font-weight', '700')
        .attr('letter-spacing', '0.1em')
        .text(corner.segment_id);
    });

    // S/F line
    if (telemetry.length > 0) {
      const [sx, sy] = proj(telemetry[0].longitude, telemetry[0].latitude);
      trackG.append('line')
        .attr('x1', sx - 8).attr('y1', sy)
        .attr('x2', sx + 8).attr('y2', sy)
        .attr('stroke', '#22d3ee')
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0.6);
    }

    // Trail path
    const trail = svg.append('path')
      .attr('class', 'car-trail')
      .attr('fill', 'none')
      .attr('stroke', 'url(#trailGrad)')
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.5);

    // Trail gradient
    const trailGrad = defs.append('linearGradient').attr('id', 'trailGrad');
    trailGrad.append('stop').attr('offset', '0%').attr('stop-color', '#fbbf24').attr('stop-opacity', '0');
    trailGrad.append('stop').attr('offset', '100%').attr('stop-color', '#fbbf24').attr('stop-opacity', '1');

    trailRef.current = trail.node();
    trailPointsRef.current = [];

    // Car marker
    const carG = svg.append('g').attr('class', 'car-group');

    // Outer pulse
    carG.append('circle').attr('class', 'car-ring').attr('r', 20)
      .attr('fill', 'none').attr('stroke', 'rgba(251,191,36,0.15)').attr('stroke-width', 1);

    // Main dot
    carG.append('circle').attr('r', 5).attr('fill', '#fbbf24').attr('filter', 'url(#carBloom)');

    // Core
    carG.append('circle').attr('r', 2).attr('fill', '#fffbeb');

  }, [telemetry, segments, dimensions]);

  // ── Imperative animation ──
  useEffect(() => {
    if (!engine || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const lineGen = d3.line<[number, number]>().x(d => d[0]).y(d => d[1]).curve(d3.curveCatmullRom.alpha(0.5));

    const unsub = engine.subscribe((pt) => {
      if (!projectionRef.current) return;
      const [x, y] = projectionRef.current(pt.longitude, pt.latitude);
      svg.select('.car-group').attr('transform', `translate(${x},${y})`);

      trailPointsRef.current.push([x, y]);
      if (trailPointsRef.current.length > 60) trailPointsRef.current.shift();
      if (trailRef.current && trailPointsRef.current.length > 1) {
        trailRef.current.setAttribute('d', lineGen(trailPointsRef.current)!);
      }
    });
    return unsub;
  }, [engine]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {/* Subtle grid */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(34,211,238,0.015) 1px, transparent 0)',
        backgroundSize: '48px 48px',
      }} />
      <svg ref={svgRef} width="100%" height="100%" className="relative" />
    </div>
  );
};
