import { useEffect } from 'react';
import * as d3 from 'd3';
import { TelemetryPoint, Segment, Lap } from '../../types/telemetry';
import { computeBrakingZones } from '../../utils/brakingAnalyzer';
import { getBrakingColor } from '../../utils/brakingColorScale';
import { createTrackProjection } from '../../utils/d3Helpers';
import { useReplayStore } from '../../store/replayStore';

interface BrakingZoneLayerProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  telemetry: TelemetryPoint[];
  segments: Segment[];
  laps: Lap[];
  dimensions: { width: number; height: number };
  drawKey?: number;
}

export const BrakingZoneLayer: React.FC<BrakingZoneLayerProps> = ({
  svgRef, telemetry, segments, laps, dimensions, drawKey
}) => {
  const visible = useReplayStore(s => s.showBrakingZones);

  useEffect(() => {
    if (!svgRef.current || !telemetry.length || dimensions.width === 0) return;

    const svg = d3.select(svgRef.current);
    const layerId = 'braking-zone-layer';
    
    // Clear previous render
    svg.select(`#${layerId}`).remove();

    if (!visible) return;

    // Define Glow Filter for the braking clouds
    const filterId = 'brakingCloudGlow';
    let defs = svg.select('defs');
    if (defs.empty()) defs = svg.append('defs');
    
    if (defs.select(`#${filterId}`).empty()) {
      const filter = defs.append('filter')
        .attr('id', filterId)
        .attr('x', '-50%').attr('y', '-50%')
        .attr('width', '200%').attr('height', '200%');
      // Strong blur to create the "cloud" aesthetic
      filter.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'blur');
      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'blur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    }

    // Insert the braking layer above the track
    let brakeG = svg.select(`#${layerId}`);
    if (brakeG.empty()) {
      const trackNode = svg.select('.track').node() as Element | null;
      if (trackNode && trackNode.parentNode) {
        brakeG = d3.select(trackNode.parentNode as Element).insert('g', () => trackNode.nextSibling as Element)
          .attr('id', layerId);
      } else {
        brakeG = svg.append('g').attr('id', layerId);
      }
    }

    brakeG
      .attr('opacity', 0)
      .attr('filter', `url(#${filterId})`);

    const proj = createTrackProjection(telemetry, dimensions.width, dimensions.height, 80);
    const brakingZones = computeBrakingZones(telemetry, laps, segments);

    // Render each braking zone
    brakingZones.forEach(zone => {
      for (let i = 0; i < zone.points.length - 1; i++) {
        const p1 = zone.points[i];
        const p2 = zone.points[i+1];
        
        const [x1, y1] = proj(p1.longitude, p1.latitude) as [number, number];
        const [x2, y2] = proj(p2.longitude, p2.latitude) as [number, number];
        
        // Color intensity tied to braking aggression
        const avgDecel = (p1.deceleration + p2.deceleration) / 2;
        const color = getBrakingColor(avgDecel);
        
        // Thicker lines for heavier braking
        const thickness = 6 + Math.min(avgDecel / 5, 12);

        brakeG.append('line')
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2)
          .attr('stroke', color)
          .attr('stroke-width', thickness)
          .attr('stroke-linecap', 'round')
          .style('mix-blend-mode', 'screen')
          .attr('opacity', 0.15); // Layered transparency
      }
    });

    // Smooth cinematic fade in
    brakeG.transition().duration(1000).ease(d3.easeCubicOut).attr('opacity', 1);

    return () => {
      svg.select(`#${layerId}`).transition().duration(500).attr('opacity', 0).remove();
    };
  }, [svgRef, telemetry, segments, laps, dimensions, visible, drawKey]);

  return null;
};
