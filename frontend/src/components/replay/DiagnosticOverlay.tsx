import React, { useState, useEffect } from 'react';
import { useReplayStore } from '../../store/replayStore';

export const DiagnosticOverlay: React.FC = () => {
  const showDiagnostics = useReplayStore(s => s.showDiagnostics);
  const currentTimestamp = useReplayStore(s => s.currentTimestamp);
  const currentLapNumber = useReplayStore(s => s.currentLapNumber);
  const currentSegmentId = useReplayStore(s => s.currentSegmentId);
  const isTheoreticalReplayActive = useReplayStore(s => s.isTheoreticalReplayActive);
  const ghostModeEnabled = useReplayStore(s => s.ghostModeEnabled);
  
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
    <div className="fixed bottom-24 left-8 z-[500] bg-black/90 border border-cyan-500/40 p-4 rounded-sm font-mono text-[10px] text-cyan-400 backdrop-blur-xl shadow-2xl">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/20">
        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
        <span className="font-black tracking-[0.2em] uppercase">SYSTEM_STABILITY_AUDIT</span>
      </div>
      
      <div className="grid grid-cols-1 gap-1.5 opacity-90">
        <div className="flex justify-between gap-12">
          <span className="text-slate-500">ENGINE_FPS</span>
          <span className={fps < 55 ? 'text-rose-500' : 'text-cyan-400'}>{fps} FPS</span>
        </div>
        <div className="flex justify-between gap-12">
          <span className="text-slate-500">TIME_VIRTUAL</span>
          <span className="text-white">{(currentTimestamp / 1000).toFixed(3)}s</span>
        </div>
        <div className="flex justify-between gap-12">
          <span className="text-slate-500">ACTIVE_LAP</span>
          <span className="text-white">LAP_{currentLapNumber ?? 'X'}</span>
        </div>
        <div className="flex justify-between gap-12">
          <span className="text-slate-500">SECTOR_ID</span>
          <span className="text-emerald-400 truncate max-w-[100px]">{currentSegmentId ?? 'NULL'}</span>
        </div>
        <div className="flex justify-between gap-12">
          <span className="text-slate-500">GHOST_STATE</span>
          <span className={ghostModeEnabled ? 'text-cyan-400' : 'text-slate-600'}>
            {ghostModeEnabled ? 'SYNC_ACTIVE' : 'DISABLED'}
          </span>
        </div>
        <div className="flex justify-between gap-12">
          <span className="text-slate-500">MODE</span>
          <span className="text-amber-400">
            {isTheoreticalReplayActive ? 'THEORETICAL' : 'STANDARD'}
          </span>
        </div>
        <div className="flex justify-between gap-12 pt-1 border-t border-cyan-500/10 mt-1">
          <span className="text-slate-500">SYNC_HEALTH</span>
          <span className="text-emerald-500">OPERATIONAL</span>
        </div>
      </div>
    </div>
  );
};
