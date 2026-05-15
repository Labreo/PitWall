import React, { useEffect, useState, useRef, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TelemetryPoint, Segment, Lap } from '../../types/telemetry';
import { ReplayEngine } from '../../engine/ReplayEngine';
import { useReplayStore } from '../../store/replayStore';
import { buildLapSplits, LapSplits, SplitTiming } from '../../utils/splitGenerator';
import { buildTheoreticalBestLap, TheoreticalBest } from '../../utils/theoreticalBestLap';
import { calculateSplitDelta, SplitDeltaResult } from '../../utils/splitDeltaCalculator';
import { getSplitColorValue } from '../../utils/splitColorRules';
import { LapHistoryHUD } from './LapHistoryHUD';

interface SplitTimingHUDProps {
  engine: ReplayEngine | null;
  telemetry: TelemetryPoint[];
  segments: Segment[];
  laps: Lap[];
}

const SplitTimingHUDComponent: React.FC<SplitTimingHUDProps> = ({ engine, telemetry, segments, laps }) => {
  const currentLapNumber = useReplayStore(s => s.currentLapNumber);
  const currentSegmentId = useReplayStore(s => s.currentSegmentId);
  const ghostSource = useReplayStore(s => s.ghostSource);
  const ghostSelectedLap = useReplayStore(s => s.ghostSelectedLap);

  const [lapSplitsMap, setLapSplitsMap] = useState<Map<number, LapSplits>>(new Map());
  const [theoreticalBest, setTheoreticalBest] = useState<TheoreticalBest | null>(null);

  const liveDeltaRef = useRef<HTMLSpanElement>(null);
  const liveDeltaContainerRef = useRef<HTMLDivElement>(null);
  const liveTimerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!laps.length || !segments.length) return;
    setLapSplitsMap(buildLapSplits(laps, segments));
    setTheoreticalBest(buildTheoreticalBestLap(laps, segments));
  }, [laps, segments]);

  // Determine the reference lap number for split comparison
  const referenceLapNumber = useMemo(() => {
    if (ghostSource === 'best') {
      if (!laps.length) return 1;
      const best = [...laps].sort((a, b) => a.lap_duration_seconds - b.lap_duration_seconds)[0];
      return best.lap_number;
    }
    return ghostSelectedLap;
  }, [ghostSource, ghostSelectedLap, laps]);

  // High-frequency subscription for live delta during current segment
  useEffect(() => {
    if (!engine || !currentLapNumber || !currentSegmentId) return;

    const currentLap = laps.find(l => l.lap_number === currentLapNumber);
    const refLap = laps.find(l => l.lap_number === referenceLapNumber);
    const lapSplits = lapSplitsMap.get(currentLapNumber);
    const refSplits = lapSplitsMap.get(referenceLapNumber);

    if (!currentLap || !refLap || !lapSplits || !refSplits) return;

    const activeSplitIdx = lapSplits.splits.findIndex(s => s.segment_id === currentSegmentId);
    if (activeSplitIdx === -1) return;

    const activeSplit = lapSplits.splits[activeSplitIdx];
    const refSplit = refSplits.splits.find(s => s.segment_id === currentSegmentId);

    if (!refSplit) return;

    const unsub = engine.subscribe(() => {
      // 1. Get high-precision time elapsed for the current lap
      const currentTimestamp = useReplayStore.getState().currentTimestamp;
      const total_elapsed = (currentTimestamp - currentLap.start_timestamp) / 1000;
      
      // 2. Reference the active segment data (PB Target)
      const pb_target = refSplit.cumulative_time_seconds;
      
      // 3. Compute live delta
      const live_delta = total_elapsed - pb_target;
      
      // 4. Format string
      const formatted_delta = Math.abs(live_delta).toFixed(2);
      
      // 5. Update UI values and CSS classes
      if (liveDeltaRef.current && liveDeltaContainerRef.current) {
        if (live_delta < 0) {
          liveDeltaRef.current.textContent = `-${formatted_delta}`;
          liveDeltaContainerRef.current.style.color = '#10b981'; // Green (Safe)
        } else if (live_delta > 0) {
          liveDeltaRef.current.textContent = `+${formatted_delta}`;
          liveDeltaContainerRef.current.style.color = '#ef4444'; // Red (Behind pace)
        } else {
          liveDeltaRef.current.textContent = '0.00';
          liveDeltaContainerRef.current.style.color = '#cbd5e1'; // Neutral
        }
      }

      if (liveTimerRef.current) {
        liveTimerRef.current.textContent = `${total_elapsed.toFixed(1)}s`;
      }
    });

    return unsub;
  }, [engine, currentLapNumber, currentSegmentId, laps, lapSplitsMap, referenceLapNumber]);


  if (!currentLapNumber) return null;

  const currentSplits = lapSplitsMap.get(currentLapNumber)?.splits || [];
  const refSplits = lapSplitsMap.get(referenceLapNumber)?.splits || [];

  // Find active split index
  const activeIndex = currentSplits.findIndex(s => s.segment_id === currentSegmentId);

  // We only show a limited number of splits to avoid giant dashboards
  // e.g. show 2 completed splits, 1 active, 2 upcoming
  let startIndex = 0;
  if (activeIndex > 2) startIndex = activeIndex - 2;
  const visibleSplits = currentSplits.slice(startIndex, startIndex + 5);

  return (
    <>
      <LapHistoryHUD 
        currentLapNumber={currentLapNumber} 
        referenceLapNumber={referenceLapNumber} 
        lapSplitsMap={lapSplitsMap} 
        theoreticalBest={theoreticalBest} 
      />

      <div className="absolute top-[40%] -translate-y-1/2 left-8 z-[60] flex flex-col items-start gap-2 pointer-events-none">
        
        <div className="flex flex-col items-start mb-2 mt-1">
          <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            LAP {currentLapNumber} SPLITS
          </span>
        <span className="text-[8px] text-slate-600 font-mono mt-0.5">
          VS LAP {referenceLapNumber}
        </span>
      </div>

      <div className="flex flex-col gap-1 w-64">
        <AnimatePresence initial={false}>
          {visibleSplits.map((split, i) => {
            const splitIdxInLap = currentSplits.findIndex(s => s.segment_id === split.segment_id);
            const isCompleted = activeIndex > splitIdxInLap || (activeIndex === -1 && useReplayStore.getState().currentTimestamp > split.end_timestamp);
            const isActive = activeIndex === splitIdxInLap;
            const refSplit = refSplits.find(s => s.segment_id === split.segment_id);

            let deltaText = '--';
            let color = getSplitColorValue('neutral');
            let isBold = false;

            if (isCompleted) {
              const res = calculateSplitDelta(split, refSplit, theoreticalBest);
              const sign = res.delta_seconds >= 0 ? '+' : '';
              deltaText = `${sign}${res.delta_seconds.toFixed(2)}`;
              color = getSplitColorValue(res.status);
              isBold = true;
            }

            return (
              <motion.div
                key={split.segment_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: isActive ? 1 : 0.8, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`flex items-center justify-between p-2 rounded border border-l-4 ${isActive ? 'bg-slate-800/80 backdrop-blur-md' : 'bg-slate-900/40'} shadow-lg`}
                style={{ 
                  borderLeftColor: isActive ? '#38bdf8' : color,
                  borderColor: isActive ? 'rgba(56,189,248,0.2)' : 'transparent',
                  borderLeftWidth: '3px'
                }}
              >
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-bold tracking-widest" style={{ color: isActive ? '#f8fafc' : '#cbd5e1' }}>
                    {split.name}
                  </span>
                  {isCompleted ? (
                    <span className="text-[9px] font-mono text-slate-500">
                      {split.cumulative_time_seconds.toFixed(1)}s
                    </span>
                  ) : isActive ? (
                    <span ref={liveTimerRef} className="text-[9px] font-mono text-cyan-400">
                      --s
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-col items-end">
                  {isActive ? (
                    <div ref={liveDeltaContainerRef} className="font-mono text-sm font-bold tracking-tight">
                      <span ref={liveDeltaRef}>0.00</span>
                    </div>
                  ) : (
                    <span className={`font-mono text-xs ${isBold ? 'font-bold' : ''}`} style={{ color }}>
                      {deltaText}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Theoretical Best Indicator */}
      {theoreticalBest && (
        <div className="mt-3 flex flex-col items-start opacity-60 hover:opacity-100 transition-opacity">
          <span className="text-[8px] font-bold text-slate-500 tracking-widest uppercase">
            THEORETICAL BEST
          </span>
          <span className="text-[11px] font-mono text-amber-400 font-bold">
            {(Math.floor(theoreticalBest.total_theoretical_seconds / 60))}:
            {(theoreticalBest.total_theoretical_seconds % 60).toFixed(2).padStart(5, '0')}
          </span>
        </div>
      )}

      </div>
    </>
  );
};

export const SplitTimingHUD = memo(SplitTimingHUDComponent);
