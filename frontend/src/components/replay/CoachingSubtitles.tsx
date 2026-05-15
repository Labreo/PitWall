import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCoachingStore } from '../../store/coachingStore';

export const CoachingSubtitles: React.FC = () => {
  const activeEvent = useCoachingStore((state) => state.activeEvent);

  if (!activeEvent) return null;

  const severityColors = {
    info: '#3b82f6',    // Blue
    warn: '#eab308',    // Yellow
    critical: '#ef4444' // Red
  };

  return (
    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeEvent.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 1.05 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden"
        >
          {/* F1 Style Background */}
          <div className="bg-black/80 backdrop-blur-md border-l-4 rounded-r-lg px-6 py-4 shadow-2xl"
               style={{ borderLeftColor: severityColors[activeEvent.severity] }}>
            
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
                Team Radio // {activeEvent.corner_id}
              </span>
              <div className="h-1 w-1 rounded-full animate-pulse" 
                   style={{ backgroundColor: severityColors[activeEvent.severity] }} />
            </div>

            <p className="text-xl font-medium text-white leading-tight">
              {activeEvent.message}
            </p>
            
            {activeEvent.delta_time_loss > 0 && (
              <div className="mt-2 text-xs font-mono text-red-400">
                Δ +{activeEvent.delta_time_loss.toFixed(3)}s
              </div>
            )}
          </div>

          {/* Radio Interference Waveform Overlay (Subtle) */}
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg width="60" height="20" viewBox="0 0 60 20">
              {[...Array(6)].map((_, i) => (
                <rect key={i} x={i * 10} y={10 - Math.random() * 10} width="2" height={Math.random() * 20} fill="white" />
              ))}
            </svg>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
