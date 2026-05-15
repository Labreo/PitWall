import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { splitStateMachine, CompletedSectorResult } from '../../engine/splitStateMachine';
import { getSplitColorValue } from '../../utils/splitColorRules';

export const LapHistoryHUD: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const updateHistory = () => {
      const activeState = splitStateMachine.getActiveState();
      const currentLap = activeState.activeLapNumber || 0;
      const newHistory = [];

      for (let l = 1; l < currentLap; l++) {
        const sectors = splitStateMachine.getCompletedSectorsForLap(l);
        if (sectors.length > 0) {
          const lastSector = sectors[sectors.length - 1];
          newHistory.push({
            lap: l,
            time: lastSector.cumulative_time_seconds,
            delta: lastSector.delta_seconds,
            status: lastSector.status
          });
        }
      }
      setHistory(newHistory);
    };

    updateHistory();
    return splitStateMachine.subscribe(updateHistory);
  }, []);

  if (history.length === 0) return null;

  return (
    <div className="absolute top-[8.5rem] right-8 z-[65] flex items-start gap-4 pointer-events-auto">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 'auto' }}
            exit={{ opacity: 0, x: 20, width: 0 }}
            className="flex flex-col items-end overflow-hidden whitespace-nowrap"
          >
            <div className="flex flex-col items-end mb-2 pr-2">
              <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                LAP HISTORY
              </span>
              <span className="text-[8px] text-slate-600 font-mono mt-0.5">
                VS SESSION BEST
              </span>
            </div>

            <div className="flex flex-col gap-1 w-56 pr-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {history.map(pl => {
                const sign = pl.delta >= 0 ? '+' : '';
                return (
                  <div key={pl.lap} className="flex items-center justify-between w-full p-2 rounded bg-slate-900/60 backdrop-blur-md border border-slate-800/50 shadow-lg">
                    <span className="text-[10px] font-bold text-slate-300">LAP {pl.lap}</span>
                    <div className="flex gap-3 items-baseline">
                      <span className="text-[10px] font-mono text-slate-500">{pl.time.toFixed(1)}s</span>
                      <span className="text-[11px] font-mono font-bold" style={{ color: getSplitColorValue(pl.status) }}>
                        {sign}{pl.delta.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-24 bg-slate-900/60 hover:bg-slate-800/80 backdrop-blur-md border border-slate-800/50 rounded-lg flex items-center justify-center text-slate-500 hover:text-cyan-400 transition-colors shadow-lg"
        title="Toggle Lap History"
      >
        <span className="text-[9px] font-bold tracking-widest uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          HISTORY
        </span>
      </button>
    </div>
  );
};

