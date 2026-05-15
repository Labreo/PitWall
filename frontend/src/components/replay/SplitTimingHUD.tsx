import React, { useEffect, useState, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TelemetryPoint, Segment, Lap } from '../../types/telemetry';
import { ReplayEngine } from '../../engine/ReplayEngine';
import { useReplayStore } from '../../store/replayStore';
import { splitStateMachine, CompletedSectorResult } from '../../engine/splitStateMachine';
import { TheoreticalBestState } from '../../engine/theoreticalBestTracker';
import { getSplitColorValue } from '../../utils/splitColorRules';
import { LapHistoryHUD } from './LapHistoryHUD';

interface SplitTimingHUDProps {
  engine: ReplayEngine | null;
}

const SplitTimingHUDComponent: React.FC<SplitTimingHUDProps> = ({ engine }) => {
  const currentLapNumber = useReplayStore(s => s.currentLapNumber);
  const currentSegmentId = useReplayStore(s => s.currentSegmentId);
  const currentTimestamp = useReplayStore(s => s.currentTimestamp);

  const [theoBest, setTheoBest] = useState<TheoreticalBestState>(splitStateMachine.getTheoreticalBest());
  const [activeState, setActiveState] = useState(splitStateMachine.getActiveState());
  const [showDebug, setShowDebug] = useState(false);

  const liveDeltaRef = useRef<HTMLSpanElement>(null);
  const liveDeltaContainerRef = useRef<HTMLDivElement>(null);
  const liveTimerRef = useRef<HTMLSpanElement>(null);

  // Subscribe to state machine updates
  useEffect(() => {
    const unsub = splitStateMachine.subscribe(() => {
      setTheoBest(splitStateMachine.getTheoreticalBest());
      setActiveState(splitStateMachine.getActiveState());
    });
    return unsub;
  }, []);

  // High-frequency subscription for live delta
  useEffect(() => {
    if (!engine || !activeState.activeLapNumber || !activeState.activeSegmentId) return;

    const lapSplits = splitStateMachine.getLapSplits(activeState.activeLapNumber);
    if (!lapSplits) return;

    const activeSplit = lapSplits.splits.find(s => s.segment_id === activeState.activeSegmentId);
    if (!activeSplit) return;

    const bestDuration = splitStateMachine.getHistoricalBestForSegment(activeSplit.split_index);

    const unsub = engine.subscribe(() => {
      const timestamp = useReplayStore.getState().currentTimestamp;
      const elapsed = (timestamp - activeSplit.start_timestamp) / 1000;

      if (liveTimerRef.current) {
        liveTimerRef.current.textContent = `${elapsed.toFixed(1)}s`;
      }

      if (liveDeltaRef.current && liveDeltaContainerRef.current) {
        if (bestDuration === null) {
          liveDeltaRef.current.textContent = '--';
          liveDeltaContainerRef.current.style.color = '#94a3b8';
        } else {
          const delta = elapsed - bestDuration;
          const formatted = Math.abs(delta).toFixed(2);
          
          if (delta < 0) {
            liveDeltaRef.current.textContent = `-${formatted}`;
            liveDeltaContainerRef.current.style.color = '#10b981'; // Gaining
          } else {
            liveDeltaRef.current.textContent = `+${formatted}`;
            liveDeltaContainerRef.current.style.color = '#ef4444'; // Losing
          }
        }
      }
    });

    return unsub;
  }, [engine, activeState.activeLapNumber, activeState.activeSegmentId]);

  if (!currentLapNumber) return null;

  const displayLapNumber = activeState.activeLapNumber || currentLapNumber;
  const lapSplits = splitStateMachine.getLapSplits(displayLapNumber);
  if (!lapSplits) return null;

  const completedSectors = splitStateMachine.getCompletedSectorsForLap(displayLapNumber);
  
  // Find visible window
  const activeIdx = lapSplits.splits.findIndex(s => s.segment_id === activeState.activeSegmentId);
  let startIndex = Math.max(0, activeIdx - 2);
  const visibleSplits = lapSplits.splits.slice(startIndex, startIndex + 5);

  return (
    <>
      <LapHistoryHUD />
      {/* Debug Toggle */}
      <button 
        onClick={() => setShowDebug(!showDebug)}
        className="absolute top-4 left-4 z-[100] px-2 py-1 bg-slate-800 text-[10px] text-slate-400 rounded opacity-20 hover:opacity-100 transition-opacity pointer-events-auto"
      >
        {showDebug ? 'HIDE DEBUG' : 'SHOW DEBUG'}
      </button>

      {showDebug && (
        <div className="absolute top-12 left-4 z-[100] p-3 bg-slate-900/90 border border-slate-700 rounded-lg font-mono text-[10px] text-cyan-400 w-64 backdrop-blur-xl">
          <div className="flex justify-between border-b border-slate-800 pb-1 mb-2 text-slate-500 font-bold uppercase tracking-wider">
            <span>Timing Debug</span>
            <span>{currentTimestamp.toFixed(0)}ms</span>
          </div>
          <div className="grid grid-cols-2 gap-y-1">
            <span className="text-slate-500">Lap:</span> <span>{activeState.activeLapNumber ?? '---'}</span>
            <span className="text-slate-500">Sector ID:</span> <span className="truncate">{activeState.activeSegmentId ?? '---'}</span>
            <span className="text-slate-500">Theo Best:</span> <span>{theoBest.totalDuration.toFixed(2)}s</span>
            <span className="text-slate-500">Sectors:</span> <span>{theoBest.segments.size} recorded</span>
            <span className="text-slate-500">Complete:</span> <span className={theoBest.isComplete ? 'text-green-400' : 'text-amber-400'}>{theoBest.isComplete ? 'YES' : 'NO'}</span>
          </div>
        </div>
      )}

      <div className="absolute top-[40%] -translate-y-1/2 left-8 z-[60] flex flex-col items-start gap-2 pointer-events-none">
        <div className="flex flex-col items-start mb-2 mt-1">
          <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            LAP {displayLapNumber} SPLITS
          </span>
          <span className="text-[8px] text-slate-600 font-mono mt-0.5">
            VS SESSION BEST
          </span>
        </div>

        <div className="flex flex-col gap-1 w-64">
          <AnimatePresence initial={false}>
            {visibleSplits.map((split) => {
              const completed = completedSectors.find(s => s.segment_id === split.segment_id);
              const isActive = activeState.activeSegmentId === split.segment_id;
              
              let deltaText = '--';
              let color = getSplitColorValue('neutral');
              
              if (completed) {
                const sign = completed.delta_seconds >= 0 ? '+' : '';
                deltaText = `${sign}${completed.delta_seconds.toFixed(2)}`;
                color = getSplitColorValue(completed.status);
              }

              return (
                <motion.div
                  key={split.segment_id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`flex items-center justify-between p-2 rounded border border-l-4 ${isActive ? 'bg-slate-800/80 backdrop-blur-md' : 'bg-slate-900/40'} shadow-lg transition-colors`}
                  style={{ 
                    borderLeftColor: isActive ? '#38bdf8' : color,
                    borderColor: isActive ? 'rgba(56,189,248,0.2)' : 'transparent',
                  }}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-[10px] font-bold tracking-widest" style={{ color: isActive ? '#f8fafc' : '#cbd5e1' }}>
                      {split.name}
                    </span>
                    {completed ? (
                      <span className="text-[9px] font-mono text-slate-500">
                        {completed.duration_seconds.toFixed(2)}s
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
                      <span className="font-mono text-xs font-bold" style={{ color }}>
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
        <div className="mt-3 flex flex-col items-start opacity-60 hover:opacity-100 transition-opacity">
          <span className="text-[8px] font-bold text-slate-500 tracking-widest uppercase">
            THEORETICAL BEST
          </span>
          <span className="text-[11px] font-mono text-amber-400 font-bold">
            {theoBest.isComplete ? (
              `${Math.floor(theoBest.totalDuration / 60)}:${(theoBest.totalDuration % 60).toFixed(2).padStart(5, '0')}`
            ) : (
              '--'
            )}
          </span>
        </div>
      </div>
    </>
  );
};

export const SplitTimingHUD = memo(SplitTimingHUDComponent);

