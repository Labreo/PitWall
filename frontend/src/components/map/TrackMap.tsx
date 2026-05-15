import React, { useEffect, useRef, useState, memo } from 'react';
import * as d3 from 'd3';
import { TelemetryPoint, Segment, Lap } from '../../types/telemetry';
import { createTrackProjection, speedToColor } from '../../utils/d3Helpers';
import { ReplayEngine } from '../../engine/ReplayEngine';
import { CornerIntelligenceLayer, CornerAnalytics } from './CornerIntelligenceLayer';
import { BrakingZoneLayer } from './BrakingZoneLayer';
import { GhostReplayLayer } from './GhostReplayLayer';

interface TrackMapProps {
  telemetry: TelemetryPoint[];
  segments: Segment[];
  laps: Lap[];
  engine: ReplayEngine | null;
  onAnalyticsReady?: (analytics: CornerAnalytics[]) => void;
  revealTrack?: boolean;
}

export const TrackMapComponent: React.FC<TrackMapProps> = ({ telemetry, segments, laps, engine, onAnalyticsReady, revealTrack = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const projectionRef = useRef<ReturnType<typeof createTrackProjection> | null>(null);
  const trailRef = useRef<SVGPathElement | null>(null);
  const trailPointsRef = useRef<[number, number][]>([]);
  const prevSpeedRef = useRef(0);
  const breatheCancelledRef = useRef(false);
  // Increments each time the SVG is fully redrawn, so the animation effect re-subscribes with fresh DOM refs
  const [drawKey, setDrawKey] = useState(0);

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

    // ── SVG Filters ──

    // Car bloom (base — will be updated dynamically)
    const carF = defs.append('filter').attr('id', 'carBloom')
      .attr('x', '-300%').attr('y', '-300%').attr('width', '700%').attr('height', '700%');
    carF.append('feGaussianBlur').attr('class', 'car-blur').attr('stdDeviation', '10').attr('result', 'blur');
    carF.append('feFlood').attr('class', 'car-flood').attr('flood-color', '#fbbf24').attr('flood-opacity', '0.9').attr('result', 'c');
    carF.append('feComposite').attr('in', 'c').attr('in2', 'blur').attr('operator', 'in').attr('result', 'glow');
    const cm = carF.append('feMerge');
    cm.append('feMergeNode').attr('in', 'glow');
    cm.append('feMergeNode').attr('in', 'SourceGraphic');

    // Track bloom
    const tF = defs.append('filter').attr('id', 'trackBloom')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    tF.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'blur');
    const tm = tF.append('feMerge');
    tm.append('feMergeNode').attr('in', 'blur');
    tm.append('feMergeNode').attr('in', 'SourceGraphic');

    // Motion blur filter for trail
    const mbF = defs.append('filter').attr('id', 'motionBlur')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    mbF.append('feGaussianBlur').attr('class', 'trail-blur').attr('stdDeviation', '3 1').attr('result', 'blur');
    mbF.append('feBlend').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('mode', 'screen');

    // Trail gradient
    const trailGrad = defs.append('linearGradient').attr('id', 'trailGrad')
      .attr('gradientUnits', 'userSpaceOnUse');
    trailGrad.append('stop').attr('offset', '0%').attr('stop-color', '#fbbf24').attr('stop-opacity', '0');
    trailGrad.append('stop').attr('offset', '70%').attr('stop-color', '#fbbf24').attr('stop-opacity', '0.3');
    trailGrad.append('stop').attr('offset', '100%').attr('stop-color', '#fbbf24').attr('stop-opacity', '0.8');

    const proj = createTrackProjection(telemetry, dimensions.width, dimensions.height, 80);
    projectionRef.current = proj;

    const trackG = svg.append('g').attr('class', 'track').attr('opacity', 0);
    const lineGen = d3.line<[number, number]>().x(d => d[0]).y(d => d[1]).curve(d3.curveCatmullRom.alpha(0.5));
    const allPts = telemetry.map(t => proj(t.longitude, t.latitude) as [number, number]);

    // Shadow track
    trackG.append('path')
      .attr('d', lineGen(allPts)!)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(15, 23, 42, 0.9)')
      .attr('stroke-width', 18)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round');

    // Track outline
    trackG.append('path')
      .attr('d', lineGen(allPts)!)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(34, 211, 238, 0.04)')
      .attr('stroke-width', 20)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round');

    // OPTIMIZED: Speed gradient segments using path stroking with gradient
    // Instead of 100+ individual lines, create overlaid stroked paths at different opacities
    const maxSpd = Math.max(...telemetry.map(t => t.speed_kmh), 1);
    
    // Build segments grouped by speed buckets for visual layering (3 layers)
    const speedBuckets = [
      { range: [0, maxSpd * 0.33], opacity: 0.3 },
      { range: [maxSpd * 0.33, maxSpd * 0.66], opacity: 0.6 },
      { range: [maxSpd * 0.66, maxSpd], opacity: 0.9 },
    ];

    // ── Start/Finish Indicator ──
    // Find the timestamp when Lap 1 officially starts (from laps.json)
    const lap1StartTs = laps[0]?.start_timestamp ?? telemetry[0].timestamp;
    const startPoint = telemetry.find(t => t.timestamp >= lap1StartTs) ?? telemetry[0];
    const [startX, startY] = proj(startPoint.longitude, startPoint.latitude);
    const sfMarker = trackG.append('g').attr('class', 'sf-marker');
    
    sfMarker.append('text')
      .attr('x', startX)
      .attr('y', startY + 6)
      .attr('text-anchor', 'middle')
      .attr('style', 'font-size: 16px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); pointer-events: none;')
      .text('🏁');
    
    sfMarker.append('text')
      .attr('x', startX)
      .attr('y', startY - 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('style', 'font-size: 8px; font-weight: 800; letter-spacing: 0.1em; pointer-events: none;')
      .text('START/FINISH');
    
    speedBuckets.forEach(bucket => {
      const bucketPts: [number, number][] = [];
      const bucketIndices: number[] = [];
      
      for (let i = 0; i < telemetry.length; i++) {
        const spd = telemetry[i].speed_kmh;
        if (spd >= bucket.range[0] && spd <= bucket.range[1]) {
          bucketIndices.push(i);
        }
      }
      
      // Draw continuous segments within bucket
      let segStart = 0;
      for (let i = 1; i < bucketIndices.length; i++) {
        if (bucketIndices[i] - bucketIndices[i - 1] > 1) {
          // Gap detected, draw segment
          const segIndices = bucketIndices.slice(segStart, i);
          if (segIndices.length > 1) {
            const segPts = segIndices.map(idx => allPts[idx]);
            const avgSpd = segIndices.reduce((sum, idx) => sum + telemetry[idx].speed_kmh, 0) / segIndices.length;
            trackG.append('path')
              .attr('d', lineGen(segPts)!)
              .attr('fill', 'none')
              .attr('stroke', speedToColor(avgSpd, maxSpd))
              .attr('stroke-width', 5)
              .attr('stroke-linecap', 'round')
              .attr('stroke-linejoin', 'round')
              .attr('opacity', bucket.opacity)
              .attr('filter', 'url(#trackBloom)');
          }
          segStart = i;
        }
      }
      // Final segment
      const segIndices = bucketIndices.slice(segStart);
      if (segIndices.length > 1) {
        const segPts = segIndices.map(idx => allPts[idx]);
        const avgSpd = segIndices.reduce((sum, idx) => sum + telemetry[idx].speed_kmh, 0) / segIndices.length;
        trackG.append('path')
          .attr('d', lineGen(segPts)!)
          .attr('fill', 'none')
          .attr('stroke', speedToColor(avgSpd, maxSpd))
          .attr('stroke-width', 5)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round')
          .attr('opacity', bucket.opacity)
          .attr('filter', 'url(#trackBloom)');
      }
    });

    // Corner labels
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
        .attr('font-size', '8px').attr('font-family', "'Inter', sans-serif")
        .attr('font-weight', '700').attr('letter-spacing', '0.1em')
        .attr('opacity', 0)
        .text(corner.segment_id);
    });

    // S/F line
    if (telemetry.length > 0) {
      const [sx, sy] = proj(telemetry[0].longitude, telemetry[0].latitude);
      trackG.append('line')
        .attr('x1', sx - 8).attr('y1', sy).attr('x2', sx + 8).attr('y2', sy)
        .attr('stroke', '#22d3ee').attr('stroke-width', 2)
        .attr('stroke-linecap', 'round').attr('opacity', 0.6);
    }

    // ── Trail (with motion blur) ──
    const trail = svg.append('path')
      .attr('class', 'car-trail')
      .attr('fill', 'none')
      .attr('stroke', 'url(#trailGrad)')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('filter', 'url(#motionBlur)')
      .attr('opacity', 0.6);
    trailRef.current = trail.node();
    trailPointsRef.current = [];

    // ── Ghost trail (faint second trail for motion blur effect) ──
    svg.append('path')
      .attr('class', 'car-ghost-trail')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(251,191,36,0.08)')
      .attr('stroke-width', 8)
      .attr('stroke-linecap', 'round')
      .attr('filter', 'url(#motionBlur)');

    // ── Car Marker Group ──
    const carG = svg.append('g').attr('class', 'car-group');

    // Outer breathing ring (animated via CSS)
    carG.append('circle').attr('class', 'car-breathe-ring').attr('r', 22)
      .attr('fill', 'none').attr('stroke', 'rgba(251,191,36,0.2)').attr('stroke-width', 1.5);

    // Speed halo (radius grows with speed)
    carG.append('circle').attr('class', 'car-speed-halo').attr('r', 14)
      .attr('fill', 'none').attr('stroke', 'rgba(251,191,36,0.06)').attr('stroke-width', 20)
      .attr('opacity', 0);

    // Contrast ring — dark outline so dot reads on any track color
    carG.append('circle').attr('class', 'car-outline').attr('r', 9)
      .attr('fill', 'none').attr('stroke', 'rgba(2,4,8,0.85)').attr('stroke-width', 3);

    // Main dot — larger, bloom applied
    carG.append('circle').attr('class', 'car-main').attr('r', 8)
      .attr('fill', '#fbbf24').attr('filter', 'url(#carBloom)');

    // Bright white core for maximum contrast
    carG.append('circle').attr('class', 'car-core').attr('r', 3).attr('fill', '#ffffff');

    // ── Ghost Car Marker Group ──
    const ghostG = svg.append('g').attr('class', 'ghost-group').attr('opacity', 0);
    
    // Ghost speed halo
    const ghostSpeedHalo = ghostG.append('circle').attr('class', 'ghost-speed-halo').attr('r', 10)
      .attr('fill', 'none').attr('stroke', 'rgba(148,163,184,0.1)').attr('stroke-width', 10)
      .attr('opacity', 0);

    // Ghost main dot
    ghostG.append('circle').attr('r', 4).attr('fill', 'rgba(203,213,225,0.8)');

    // Split line bloom
    const slF = defs.append('filter').attr('id', 'splitBloom')
      .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    slF.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
    const slm = slF.append('feMerge');
    slm.append('feMergeNode').attr('in', 'blur');
    slm.append('feMergeNode').attr('in', 'SourceGraphic');

    // ── Split Connection Line (between car and ghost) ──
    const splitLineGlow = svg.append('line').attr('class', 'split-line-glow')
      .attr('stroke-width', 4)
      .attr('filter', 'url(#splitBloom)')
      .attr('opacity', 0);

    const splitLine = svg.append('line').attr('class', 'split-line')
      .attr('stroke', 'rgba(255,255,255,0.2)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0);

    // ── Idle breathing animation for car ring ──
    breatheCancelledRef.current = false;
    function breathe() {
      if (breatheCancelledRef.current) return;
      const ring = svg.select('.car-breathe-ring');
      if (ring.empty()) return;
      ring.transition().duration(2000).ease(d3.easeSinInOut)
        .attr('r', 26).attr('stroke-opacity', 0.05)
        .transition().duration(2000).ease(d3.easeSinInOut)
        .attr('r', 18).attr('stroke-opacity', 0.15)
        .on('end', () => { if (!breatheCancelledRef.current) breathe(); });
    }
    breathe();

    // Signal animation effect to re-cache DOM refs now that SVG is populated
    setDrawKey(k => k + 1);

    return () => { breatheCancelledRef.current = true; };
  }, [telemetry, segments, dimensions]);

  // ── Track reveal (triggered by parent after intro sweep) ──
  useEffect(() => {
    if (!revealTrack || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const track = svg.select('.track');
    if (track.empty()) return;

    // Stagger: base + speed bucket layers fade in sequentially
    track.transition().duration(800).ease(d3.easeCubicOut).attr('opacity', 1)
      .on('end', () => {
        // Pulse corner labels in after track is visible
        svg.selectAll('text')
          .attr('opacity', 0)
          .transition().duration(400).ease(d3.easeCubicOut)
          .delay((_, i) => i * 60)
          .attr('opacity', 1);
      });
  }, [revealTrack]);

  // ── Imperative animation ──
  useEffect(() => {
    if (!engine || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const lineGen = d3.line<[number, number]>().x(d => d[0]).y(d => d[1]).curve(d3.curveCatmullRom.alpha(0.5));

    // Pre-cache element references to avoid expensive d3.select() calls every frame
    // Use raw DOM elements for hot path updates
    const carGroupEl = svgRef.current.querySelector('.car-group') as SVGGElement;
    const carMainEl = svgRef.current.querySelector('.car-main') as SVGCircleElement;
    const carBlurFilterEl = svgRef.current.querySelector('.car-blur') as SVGFEGaussianBlurElement;
    const carFloodFilterEl = svgRef.current.querySelector('.car-flood') as SVGFEFloodElement;
    const carSpeedHaloEl = svgRef.current.querySelector('.car-speed-halo') as SVGCircleElement;
    const trailEl = svgRef.current.querySelector('.car-trail') as SVGPathElement;
    const ghostTrailEl = svgRef.current.querySelector('.car-ghost-trail') as SVGPathElement;
    const trailBlurEl = svgRef.current.querySelector('.trail-blur') as SVGFEGaussianBlurElement;
    const trailGradEl = svgRef.current.querySelector('#trailGrad') as SVGLinearGradientElement;
    const ghostGroupEl = svgRef.current.querySelector('.ghost-group') as SVGGElement;
    const ghostSpeedHaloEl = svgRef.current.querySelector('.ghost-speed-halo') as SVGCircleElement;
    const splitLineGlowEl = svgRef.current.querySelector('.split-line-glow') as SVGLineElement;
    const splitLineEl = svgRef.current.querySelector('.split-line') as SVGLineElement;

    const unsub = engine.subscribe((pt, ghostPt) => {
      if (!projectionRef.current) return;
      const [x, y] = projectionRef.current(pt.longitude, pt.latitude);
      const speed = pt.speed_kmh;
      const speedNorm = Math.min(speed / 200, 1);

      // Move car (GPU-accelerated transform) - use raw DOM
      carGroupEl.setAttribute('transform', `translate(${x},${y})`);

      // ── Speed-reactive car glow (batch updates, use raw DOM) ──
      const blurVal = 8 + speedNorm * 14;
      const floodOpacity = 0.7 + speedNorm * 0.3;
      carBlurFilterEl.setAttribute('stdDeviation', blurVal.toFixed(1));
      carFloodFilterEl.setAttribute('flood-opacity', floodOpacity.toFixed(2));

      // Color shift: amber → red at high speed
      const haloColor = speed > 150
        ? `rgba(248,113,113,${0.04 + speedNorm * 0.08})`
        : `rgba(251,191,36,${0.02 + speedNorm * 0.06})`;

      carSpeedHaloEl.setAttribute('opacity', (speedNorm * 0.8).toString());
      carSpeedHaloEl.setAttribute('r', (10 + speedNorm * 18).toString());
      carSpeedHaloEl.setAttribute('stroke', haloColor);
      carSpeedHaloEl.setAttribute('stroke-width', (12 + speedNorm * 16).toString());

      // Main dot color shift
      carMainEl.setAttribute('fill', speed > 160 ? '#fb923c' : speed > 120 ? '#fbbf24' : '#fbbf24');

      // ── Trail with motion blur ──
      trailPointsRef.current.push([x, y]);
      const maxTrail = Math.max(20, Math.round(30 + speedNorm * 50));
      while (trailPointsRef.current.length > maxTrail) trailPointsRef.current.shift();

      if (trailEl && trailPointsRef.current.length > 1) {
        const path = lineGen(trailPointsRef.current)!;
        trailEl.setAttribute('d', path);
        ghostTrailEl.setAttribute('d', path);
      }

      // Dynamic motion blur based on speed
      const blurX = (1 + speedNorm * 5).toFixed(1);
      const blurY = (0.5 + speedNorm * 1).toFixed(1);
      trailBlurEl.setAttribute('stdDeviation', `${blurX} ${blurY}`);

      // ── Trail gradient follows car ──
      if (trailPointsRef.current.length > 1) {
        const start = trailPointsRef.current[0];
        const end = trailPointsRef.current[trailPointsRef.current.length - 1];
        trailGradEl.setAttribute('x1', start[0].toString());
        trailGradEl.setAttribute('y1', start[1].toString());
        trailGradEl.setAttribute('x2', end[0].toString());
        trailGradEl.setAttribute('y2', end[1].toString());
      }

      // ── Ghost Lap Updates ──
      if (ghostPt) {
        const [gx, gy] = projectionRef.current(ghostPt.longitude, ghostPt.latitude);
        
        ghostGroupEl.setAttribute('opacity', '1');
        ghostGroupEl.setAttribute('transform', `translate(${gx},${gy})`);
        
        const gSpeedNorm = Math.min(ghostPt.speed_kmh / 200, 1);
        const gHaloCol = speed > ghostPt.speed_kmh ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)';
        
        ghostSpeedHaloEl.setAttribute('opacity', (gSpeedNorm * 0.6).toString());
        ghostSpeedHaloEl.setAttribute('r', (8 + gSpeedNorm * 14).toString());
        ghostSpeedHaloEl.setAttribute('stroke', gHaloCol);

        // Update split connection line
        const slCol = speed > ghostPt.speed_kmh ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.6)';
        const slGlowCol = speed > ghostPt.speed_kmh ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)';

        splitLineGlowEl.setAttribute('opacity', '1');
        splitLineGlowEl.setAttribute('x1', x.toString());
        splitLineGlowEl.setAttribute('y1', y.toString());
        splitLineGlowEl.setAttribute('x2', gx.toString());
        splitLineGlowEl.setAttribute('y2', gy.toString());
        splitLineGlowEl.setAttribute('stroke', slGlowCol);

        splitLineEl.setAttribute('opacity', '0.8');
        splitLineEl.setAttribute('x1', x.toString());
        splitLineEl.setAttribute('y1', y.toString());
        splitLineEl.setAttribute('x2', gx.toString());
        splitLineEl.setAttribute('y2', gy.toString());
        splitLineEl.setAttribute('stroke', slCol);
      } else {
        ghostGroupEl.setAttribute('opacity', '0');
        splitLineEl.setAttribute('opacity', '0');
        splitLineGlowEl.setAttribute('opacity', '0');
      }

      prevSpeedRef.current = speed;
    });
    return unsub;
  }, [engine, drawKey]);


  return (
    <div ref={containerRef} className="absolute inset-0 z-[10]">
      {/* Animated background grid */}
      <div className="absolute inset-0 animated-grid" />

      {/* SVG with camera drift */}
      <div className="absolute inset-0 camera-drift">
        <svg ref={svgRef} width="100%" height="100%" />
      </div>

      {/* Corner intelligence overlay — appends into shared SVG */}
      <CornerIntelligenceLayer
        svgRef={svgRef}
        telemetry={telemetry}
        segments={segments}
        dimensions={dimensions}
        onAnalyticsReady={onAnalyticsReady}
      />
      
      {/* Braking clouds overlay */}
      <BrakingZoneLayer
        svgRef={svgRef}
        telemetry={telemetry}
        segments={segments}
        laps={laps}
        dimensions={dimensions}
      />

      {/* Ghost racing overlay */}
      <GhostReplayLayer
        svgRef={svgRef}
        telemetry={telemetry}
        segments={segments}
        laps={laps}
        dimensions={dimensions}
        engine={engine}
      />
    </div>
  );
};

export const TrackMap = memo(TrackMapComponent);
