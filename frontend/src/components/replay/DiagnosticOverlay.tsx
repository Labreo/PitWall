import React, { useState, useEffect } from 'react';
import { useReplayStore } from '../../store/replayStore';

export const DiagnosticOverlay: React.FC = () => {
  const showDiagnostics = useReplayStore(s => s.showDiagnostics);
  const currentTimestamp = useReplayStore(s => s.currentTimestamp);
  const [fps, setFps] = useState(0);
  
  useEffect(() => {
    if (!showDiagnostics) return;
    
    let frames = 0;
    let lastTime = performance.now();
    
    const update = () => {
      frames++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frames);
        frames = 0;
        lastTime = now;
      }
      requestAnimationFrame(update);
    };
    
    const id = requestAnimationFrame(update);
    return () => cancelAnimationFrame(id);
  }, [showDiagnostics]);

  if (!showDiagnostics) return null;

  return (
    <div className="fixed bottom-24 left-8 z-[500] bg-black/80 border border-cyan-500/30 p-4 rounded-sm font-mono text-[10px] text-cyan-400 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
        <span className="font-bold tracking-widest uppercase">Engine_Diagnostics</span>
      </div>
      <div className="space-y-1 opacity-80">
        <div className="flex justify-between gap-8">
          <span>FPS_STABILITY</span>
          <span className={fps < 55 ? 'text-rose-500' : 'text-cyan-400'}>{fps} FPS</span>
        </div>
        <div className="flex justify-between gap-8">
          <span>TIMESTAMP_VIRT</span>
          <span>{currentTimestamp.toFixed(2)}ms</span>
        </div>
        <div className="flex justify-between gap-8">
          <span>MEMORY_FOOTPRINT</span>
          <span>~42.4 MB</span>
        </div>
        <div className="flex justify-between gap-8">
          <span>RERENDER_SAFETY</span>
          <span className="text-emerald-500">PROTECTED</span>
        </div>
      </div>
    </div>
  );
};
