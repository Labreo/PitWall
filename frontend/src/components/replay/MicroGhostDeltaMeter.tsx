import React, { useRef, useEffect, memo } from 'react';
import { ReplayEngine } from '../../engine/ReplayEngine';
import { DeltaSmoother } from '../../utils/deltaSmoother';
import { DELTA_COLORS, getDeltaColor } from '../../utils/deltaColorScale';
import { useReplayStore } from '../../store/replayStore';

interface MicroGhostDeltaMeterProps {
  engine: ReplayEngine | null;
}

const MicroGhostDeltaMeterComponent: React.FC<MicroGhostDeltaMeterProps> = ({ engine }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const smoother = useRef(new DeltaSmoother(15)); // 15 frame window for smooth visuals
  
  const ghostModeEnabled = useReplayStore(s => s.ghostModeEnabled);

  useEffect(() => {
    if (!engine) return;

    const unsub = engine.subscribe((_, ghostPt, ghostTimeDeltaMs) => {
      if (!containerRef.current) return;

      if (!ghostModeEnabled || ghostPt === null) {
        containerRef.current.style.opacity = '0';
        return;
      }

      containerRef.current.style.opacity = '1';

      // 1. Smooth the delta for visual stability
      const deltaS = (ghostTimeDeltaMs ?? 0) / 1000;
      const smoothedDelta = smoother.current.smooth(deltaS);

      // 2. Update the numeric display
      if (textRef.current) {
        const prefix = smoothedDelta >= 0 ? '+' : '';
        textRef.current.textContent = `${prefix}${smoothedDelta.toFixed(3)}`;
        textRef.current.style.color = getDeltaColor(smoothedDelta);
      }

      // 3. Update the GAINING/LOSING status
      if (statusRef.current) {
        if (Math.abs(smoothedDelta) < 0.005) {
          statusRef.current.textContent = 'PARITY';
          statusRef.current.style.color = 'rgba(255,255,255,0.4)';
        } else if (smoothedDelta < 0) {
          statusRef.current.textContent = 'GAINING';
          statusRef.current.style.color = DELTA_COLORS.GAINING;
        } else {
          statusRef.current.textContent = 'LOSING';
          statusRef.current.style.color = DELTA_COLORS.LOSING;
        }
      }

      // 4. Update the bar expansion
      if (barRef.current) {
        // Clamp delta for bar width calculation (-2s to +2s range)
        const range = 2.0;
        const clampedDelta = Math.max(-range, Math.min(range, smoothedDelta));
        const percentage = (clampedDelta / range) * 50; // Max 50% from center

        if (clampedDelta < 0) {
          // Gaining - Expand left
          barRef.current.style.width = `${Math.abs(percentage)}%`;
          barRef.current.style.right = '50%';
          barRef.current.style.left = 'auto';
          barRef.current.style.backgroundColor = DELTA_COLORS.GAINING;
          barRef.current.style.boxShadow = `0 0 15px ${DELTA_COLORS.GAINING}44`;
        } else {
          // Losing - Expand right
          barRef.current.style.width = `${Math.abs(percentage)}%`;
          barRef.current.style.left = '50%';
          barRef.current.style.right = 'auto';
          barRef.current.style.backgroundColor = DELTA_COLORS.LOSING;
          barRef.current.style.boxShadow = `0 0 15px ${DELTA_COLORS.LOSING}44`;
        }
      }
    });

    return () => {
      unsub();
      smoother.current.reset();
    };
  }, [engine, ghostModeEnabled]);

  return (
    <div 
      ref={containerRef}
      className="absolute bottom-[104px] left-1/2 -translate-x-1/2 w-[400px] z-[70] pointer-events-none transition-opacity duration-300"
      style={{ opacity: 0 }}
    >
      {/* Labels */}
      <div className="flex justify-between items-end mb-1 px-1">
        <div ref={statusRef} className="text-[8px] font-black tracking-[0.2em] uppercase opacity-80">
          PARITY
        </div>
        <div ref={textRef} className="text-sm font-mono font-bold tracking-tighter">
          +0.000
        </div>
      </div>

      {/* The Bar Track */}
      <div className="relative w-full h-[4px] bg-white/5 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
        {/* Center Line with subtle pulse animation when at parity */}
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/40 z-10 parity-pulse" />
        
        {/* Delta Indicator Bar */}
        <div 
          ref={barRef}
          className="absolute top-0 bottom-0 transition-[width,left,right] duration-75 ease-out"
          style={{ width: '0%', left: '50%' }}
        />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes parityPulse {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }
        .parity-pulse {
          animation: parityPulse 2s infinite ease-in-out;
        }
      `}} />

      {/* Decorative ticks */}
      <div className="flex justify-between px-[10%] mt-1 opacity-20">
        <div className="w-px h-1 bg-white" />
        <div className="w-px h-1 bg-white" />
        <div className="w-px h-1 bg-white" />
        <div className="w-px h-1 bg-white" />
        <div className="w-px h-1 bg-white" />
      </div>
    </div>
  );
};

export const MicroGhostDeltaMeter = memo(MicroGhostDeltaMeterComponent);
