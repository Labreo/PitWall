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
  errorMsg?: string;
  onComplete: () => void;
  onReset: () => void;
}

export const TelemetryReconstructionView: React.FC<TelemetryReconstructionViewProps> = ({ 
  stage, 
  overallStatus,
  videoUrl, 
  errorMsg,
  onComplete,
  onReset
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

      {/* Reconstruction Failure Overlay */}
      <AnimatePresence>
        {overallStatus === 'failed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-12 overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.1)_0%,transparent_70%)] pointer-events-none" />
            <div className="absolute inset-0 scanlines opacity-5 pointer-events-none" />

            <div className="max-w-xl w-full text-center space-y-8 relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-mono text-rose-500 tracking-[0.4em] uppercase">Reconstruction_Critical_Fault</p>
                <h2 className="text-3xl font-black tracking-tight text-white uppercase">GoPro Telemetry Ingest Failed</h2>
                <p className="text-zinc-400 text-xs font-mono max-w-sm mx-auto leading-relaxed uppercase tracking-wider">
                  The physics pipeline could not resolve a valid GPMF metadata track inside the uploaded MP4 package.
                </p>
              </div>

              <div className="p-5 bg-rose-950/20 border border-rose-500/20 rounded-sm text-left font-mono text-[11px] text-zinc-300 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1.5 text-[8px] text-rose-500/40 uppercase tracking-widest">
                  SYS_ERROR_LOG
                </div>
                <p className="text-rose-400 font-bold uppercase tracking-wider">Error Details:</p>
                <p className="leading-relaxed whitespace-pre-wrap break-all opacity-80">
                  {errorMsg || "telemetry_ingest.ExtractionError: No active GPS5, ACCL, or GYRO GPMF binary data channels discovered in target MP4 container."}
                </p>
              </div>

              <div className="pt-4 flex flex-col gap-4">
                <button
                  onClick={onReset}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono uppercase tracking-[0.2em] transition-all shadow-[0_0_30px_rgba(239,68,68,0.2)] rounded-sm"
                >
                  Return to Source Deployment
                </button>
                <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                  Tip: Enable GPS on your GoPro Hero, or test using our Donington Park sample MP4
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>

  );
};
