import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useReplayStore } from '../../store/replayStore';
import { StitchedTheoreticalLap } from '../../utils/theoreticalLapAssembler';

interface TheoreticalLapReplayLayerProps {
  svgRef: React.RefObject<SVGSVGElement>;
  projection: (coords: [number, number]) => [number, number] | null;
  drawKey: number;
}

export const TheoreticalLapReplayLayer: React.FC<TheoreticalLapReplayLayerProps> = ({
  svgRef,
  projection,
  drawKey
}) => {
  const theoreticalLapData = useReplayStore(s => s.theoreticalLapData as StitchedTheoreticalLap | null);
  const isTheoreticalActive = useReplayStore(s => s.isTheoreticalReplayActive);
  const currentTimestamp = useReplayStore(s => s.currentTimestamp);
  
  const ghostRef = useRef<SVGCircleElement | null>(null);
  const trailRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !theoreticalLapData || !isTheoreticalActive) {
      d3.select(ghostRef.current).style('opacity', 0);
      d3.select(trailRef.current).style('opacity', 0);
      return;
    }

    const svg = d3.select(svgRef.current);
    
    // Create/select ghost element
    let ghost = svg.select<SVGCircleElement>('.theoretical-ghost');
    if (ghost.empty()) {
      ghost = svg.append('circle')
        .attr('class', 'theoretical-ghost')
        .attr('r', 5)
        .style('fill', '#22d3ee')
        .style('filter', 'drop-shadow(0 0 8px rgba(34,211,238,0.8))')
        .style('stroke', 'white')
        .style('stroke-width', 1);
      ghostRef.current = ghost.node();
    }

    // Find position at current timestamp (relative to lap start)
    const relTime = currentTimestamp % theoreticalLapData.totalDurationMs;
    
    // Find closest telemetry point
    const points = theoreticalLapData.telemetry;
    const bisect = d3.bisector((d: any) => d.timestamp).left;
    const idx = bisect(points, relTime);
    const pt = points[idx] || points[points.length - 1];

    if (pt) {
      const projected = projection([pt.longitude, pt.latitude]);
      if (projected) {
        ghost
          .attr('cx', projected[0])
          .attr('cy', projected[1])
          .style('opacity', 1);
      }
    }

  }, [currentTimestamp, theoreticalLapData, isTheoreticalActive, projection, drawKey]);

  return null;
};
