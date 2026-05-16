import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoAnalysisSurface } from './VideoAnalysisSurface';
import { TrackRebuildAnimation } from './TrackRebuildAnimation';
import { TelemetryDiagnosticsOverlay } from './TelemetryDiagnosticsOverlay';
import { IntelligenceStageAnimator } from './IntelligenceStageAnimator';

interface TelemetryReconstructionViewProps {
  stage: number;
  overallStatus: string;
  videoUrl: string | null;
  onComplete: () => void;
}

export const TelemetryReconstructionView: React.FC<TelemetryReconstructionViewProps> = ({ 
  stage, 
  overallStatus,
  videoUrl, 
  onComplete 
}) => {
  const isFinished = overallStatus === 'completed';

  // Logic: Transition to replay when final stage is reached
  React.useEffect(() => {
    if (isFinished) {
      const timer = setTimeout(onComplete, 2500); // Cinematic linger
      return () => clearTimeout(timer);
    }
  }, [isFinished, onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#020617] text-white select-none overflow-hidden"
    >
      {/* Layer 0: Video Analysis Background */}
      <VideoAnalysisSurface videoUrl={videoUrl} />

      {/* Layer 1: Track Reconstruction (Centerpiece) */}
      <TrackRebuildAnimation stage={stage} />

      {/* Layer 2: Diagnostic HUD Elements */}
      <TelemetryDiagnosticsOverlay />

      {/* Layer 3: Sequential Intelligence Log */}
      <IntelligenceStageAnimator currentStage={stage} overallStatus={overallStatus} />

      {/* Atmospheric Scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-50 overflow-hidden">
        <div className="absolute inset-0 scanlines" />
      </div>

      {/* Stage Transition Overlay (Flashes on stage update) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0.1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 bg-cyan-400 pointer-events-none z-40"
        />
      </AnimatePresence>

      {/* System Status Bar (Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 h-12 border-t border-cyan-500/10 flex items-center justify-between px-10 bg-slate-950/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-6">
          <div className="text-[10px] font-mono text-cyan-400 tracking-widest font-bold">
            PITWALL_CORE_RECONSTRUCTION
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 9 }).map((_, i) => {
              const isComp = i < stage || (i === stage && isFinished);
              return (
                <div 
                  key={i} 
                  className={`w-4 h-1 rounded-full transition-all duration-700 ${
                    isComp ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]' : 'bg-slate-800'
                  }`} 
                />
              );
            })}
          </div>
        </div>
        
        <div className="text-[10px] font-mono text-slate-500 tracking-widest">
          VERSION_24.4.2 // SECURE_SOCKET_ACTIVE
        </div>
      </div>

      {/* Replay Boot Sequence (Final Overlay) */}
      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-[200] bg-white flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.8, ease: "circIn" }}
              className="h-[2px] bg-cyan-500"
            />
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-black font-black text-4xl tracking-tighter mt-4"
            >
              LAUNCHING REPLAY ENGINE
            </motion.h2>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
