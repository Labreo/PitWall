import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReplayStore } from '../../store/replayStore';
import { StitchedTheoreticalLap } from '../../utils/theoreticalLapAssembler';

export const TheoreticalReplayHUD: React.FC = () => {
  const isTheoreticalActive = useReplayStore(s => s.isTheoreticalReplayActive);
  const theoreticalLapData = useReplayStore(s => s.theoreticalLapData as StitchedTheoreticalLap | null);
  const currentTimestamp = useReplayStore(s => s.currentTimestamp);
  const [activeLabel, setActiveLabel] = useState<{ text: string, lap: number } | null>(null);

  useEffect(() => {
    if (!isTheoreticalActive || !theoreticalLapData) return;

    // Find which sector we are in
    let accumulatedTime = 0;
    let currentSector = null;

    for (const sector of theoreticalLapData.sectors) {
      const duration = sector.bestSegment.end_timestamp - sector.bestSegment.start_timestamp;
      if (currentTimestamp >= accumulatedTime && currentTimestamp < accumulatedTime + duration) {
        currentSector = sector;
        break;
      }
      accumulatedTime += duration;
    }

    if (currentSector) {
      // Determine label based on sector performance markers
      const labels = ["BEST BRAKING", "BEST EXIT", "BEST ENTRY SPEED", "BEST THROTTLE APPLICATION"];
      const labelIdx = parseInt(currentSector.bestSegment.segment_id.replace(/\D/g, '')) % labels.length;
      setActiveLabel({
        text: labels[labelIdx],
        lap: currentSector.lapNumber
      });
    } else {
      setActiveLabel(null);
    }
  }, [currentTimestamp, isTheoreticalActive, theoreticalLapData]);

  return (
    <div className="pointer-events-none">
      <AnimatePresence>
        {isTheoreticalActive && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-[80] text-center"
          >
            <div className="text-[10px] font-mono text-cyan-400 tracking-[0.5em] uppercase mb-1">
              Performance_Reconstruction
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter italic">
              THEORETICAL BEST LAP
            </h2>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {activeLabel && (
          <motion.div
            key={activeLabel.text}
            initial={{ opacity: 0, scale: 0.9, x: -50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 1.1, x: 50 }}
            className="absolute top-1/2 left-20 -translate-y-1/2 z-[80]"
          >
            <div className="flex items-center gap-4">
              <div className="w-1 h-12 bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
              <div>
                <div className="text-[8px] font-mono text-cyan-500 tracking-widest uppercase opacity-60">
                  Sector_Insight // FROM_LAP_{activeLabel.lap}
                </div>
                <div className="text-xl font-black text-white tracking-tight uppercase italic">
                  {activeLabel.text}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
