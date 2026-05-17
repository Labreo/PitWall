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

  const glowColor = severityColors[activeEvent.severity] || '#ef4444';

  return (
    <div className="fixed bottom-36 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 pointer-events-none">
      {/* Self-contained premium animations */}
      <style>{`
        @keyframes f1Scanline {
          0% { top: -100%; }
          100% { top: 200%; }
        }
        @keyframes f1WaveBar {
          0%, 100% { height: 4px; opacity: 0.4; }
          50% { height: 22px; opacity: 1; }
        }
        @keyframes f1TextGlow {
          0%, 100% { text-shadow: 0 0 4px rgba(255,255,255,0); }
          50% { text-shadow: 0 0 12px ${glowColor}88; }
        }
      `}</style>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeEvent.id}
          initial={{ opacity: 0, y: 30, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 1.04 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-r-lg shadow-2xl border-l-4"
          style={{ 
            borderLeftColor: severityColors[activeEvent.severity],
            boxShadow: `0 0 35px ${glowColor}25`
          }}
        >
          {/* Scanline Sweep Overlay */}
          <div 
            className="absolute left-0 right-0 h-1 bg-white/20 blur-[1px] pointer-events-none"
            style={{ 
              animation: 'f1Scanline 3s linear infinite'
            }}
          />

          {/* Premium F1 Style Content Box */}
          <div className="bg-slate-950/95 backdrop-blur-xl px-6 py-4 flex flex-col gap-1 relative z-10">
            
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <span 
                  className="px-2 py-0.5 text-[9px] font-extrabold tracking-[0.25em] text-black uppercase rounded"
                  style={{ backgroundColor: severityColors[activeEvent.severity] }}
                >
                  ENGINEER RADIO
                </span>
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                  {activeEvent.corner_id || 'PIT'} // LAP {activeEvent.lap_number}
                </span>
              </div>

              {/* Reactive F1 Style Waveform Visualizer */}
              <div className="flex items-end gap-[3px] h-6 px-2 pointer-events-none">
                {[0.4, 0.2, 0.6, 0.1, 0.7, 0.3, 0.5, 0.2].map((delay, idx) => (
                  <div
                    key={idx}
                    className="w-[2px] rounded-full"
                    style={{
                      backgroundColor: severityColors[activeEvent.severity],
                      animation: 'f1WaveBar 1.2s ease-in-out infinite',
                      animationDelay: `${delay}s`,
                      transformOrigin: 'bottom'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Glowing Instruction text */}
            <p 
              className="text-xl font-bold tracking-tight text-white leading-snug"
              style={{
                animation: 'f1TextGlow 2.5s ease-in-out infinite'
              }}
            >
              {activeEvent.message}
            </p>
            
            {activeEvent.delta_time_loss > 0 && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10px] font-mono text-red-500 font-extrabold uppercase animate-pulse">
                  TIME LOSS DETECTED
                </span>
                <span className="text-xs font-mono font-extrabold text-red-400">
                  Δ +{activeEvent.delta_time_loss.toFixed(3)}s
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
