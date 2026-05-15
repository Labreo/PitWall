import React, { memo, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useReplayStore } from '../../store/replayStore';
import { Play, Pause } from 'lucide-react';

const SPEEDS = [0.25, 0.5, 1, 2, 4];

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${sec.toString().padStart(2, '0')}.${ms}`;
};

const PlaybackControlsComponent: React.FC = () => {
  // Only subscribe to low-frequency state — NOT currentTimestamp
  const isPlaying = useReplayStore(s => s.isPlaying);
  const playbackSpeed = useReplayStore(s => s.playbackSpeed);
  const sessionStart = useReplayStore(s => s.sessionStart);
  const sessionEnd = useReplayStore(s => s.sessionEnd);
  const ghostModeEnabled = useReplayStore(s => s.ghostModeEnabled);
  const showBrakingZones = useReplayStore(s => s.showBrakingZones);
  const togglePlay = useReplayStore(s => s.togglePlay);
  const setPlaybackSpeed = useReplayStore(s => s.setPlaybackSpeed);
  const seekTo = useReplayStore(s => s.seekTo);
  const toggleGhostMode = useReplayStore(s => s.toggleGhostMode);
  const toggleBrakingZones = useReplayStore(s => s.toggleBrakingZones);

  // DOM refs for high-frequency updates (avoids re-render on every frame)
  const progressFillRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<HTMLInputElement>(null);
  const elapsedRef = useRef<HTMLSpanElement>(null);
  const isFinishedRef = useRef(false);

  // Subscribe to timestamp imperatively (no React re-render)
  useEffect(() => {
    const unsub = useReplayStore.subscribe((state) => {
      const { currentTimestamp, sessionStart: start, sessionEnd: end } = state;
      if (end <= start) return;
      const progress = ((currentTimestamp - start) / (end - start)) * 100;
      const elapsed = (currentTimestamp - start) / 1000;
      isFinishedRef.current = progress >= 99.9;

      if (progressFillRef.current) progressFillRef.current.style.width = `${progress}%`;
      if (scrubberRef.current) scrubberRef.current.value = progress.toString();
      if (elapsedRef.current) elapsedRef.current.textContent = fmt(elapsed);
    });
    return unsub;
  }, []);

  const total = (sessionEnd - sessionStart) / 1000;

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(sessionStart + (parseFloat(e.target.value) / 100) * (sessionEnd - sessionStart));
  }, [seekTo, sessionStart, sessionEnd]);

  const handleTogglePlay = useCallback(() => {
    if (isFinishedRef.current) {
      seekTo(sessionStart);
      if (!isPlaying) togglePlay();
    } else {
      togglePlay();
    }
  }, [isPlaying, togglePlay, seekTo, sessionStart]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="absolute bottom-0 left-0 right-0 z-[70] px-6 pb-4 pt-8 pointer-events-auto"
    >
      {/* Timeline bar — updated imperatively via refs, no re-render */}
      <div className="flex items-center gap-3 mb-2.5">
        <span ref={elapsedRef} className="bc-value text-[11px] w-12 text-right tabular-nums" style={{ color: 'rgba(34,211,238,0.6)' }}>
          0:00.0
        </span>

        <div className="relative flex-1 group">
          {/* Glow fill — width driven by ref */}
          <div ref={progressFillRef} className="absolute top-1/2 left-0 h-[2px] -translate-y-[1px] rounded-full pointer-events-none" style={{
            width: '0%',
            background: 'linear-gradient(90deg, rgba(34,211,238,0.7), rgba(52,211,153,0.5))',
            boxShadow: '0 0 8px rgba(34,211,238,0.25)',
          }} />
          <input
            ref={scrubberRef}
            type="range" className="timeline-slider" min={0} max={100} step={0.05}
            defaultValue={0} onChange={handleScrub}
          />
        </div>

        <span className="bc-value text-[11px] w-12 tabular-nums" style={{ color: 'rgba(148,163,184,0.3)' }}>
          {fmt(total)}
        </span>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between">
        {/* Play + Status */}
        <div className="flex items-center gap-3">
          <button onClick={handleTogglePlay}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 group"
            style={{
              background: isPlaying ? 'rgba(34,211,238,0.06)' : 'rgba(34,211,238,0.1)',
              border: `1px solid rgba(34,211,238,${isPlaying ? 0.15 : 0.25})`,
              boxShadow: isPlaying ? 'none' : '0 0 16px rgba(34,211,238,0.1)',
            }}
          >
            {isPlaying ? (
              <Pause size={14} style={{ color: 'rgba(34,211,238,0.8)' }} />
            ) : (
              <Play size={14} style={{ color: '#22d3ee', marginLeft: 1 }} />
            )}
          </button>

          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 rec-dot' : 'bg-slate-700'}`}
              style={isPlaying ? { boxShadow: '0 0 6px rgba(52,211,153,0.5)' } : {}} />
            <span className="text-[9px] font-semibold tracking-[0.2em] uppercase"
              style={{ color: isPlaying ? 'rgba(52,211,153,0.6)' : 'rgba(100,116,139,0.4)' }}>
              {isPlaying ? 'REPLAY' : 'PAUSED'}
            </span>
          </div>
        </div>

        {/* Toggles + Speed */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleBrakingZones}
            className="flex items-center gap-1.5 px-2 py-1 rounded transition-all duration-200"
            style={{
              background: showBrakingZones ? 'rgba(239,68,68,0.1)' : 'transparent',
              border: `1px solid ${showBrakingZones ? 'rgba(239,68,68,0.3)' : 'rgba(148,163,184,0.1)'}`,
            }}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${showBrakingZones ? 'bg-red-500' : 'bg-slate-600'}`}
              style={showBrakingZones ? { boxShadow: '0 0 6px rgba(239,68,68,0.6)' } : {}} />
            <span className="text-[9px] font-semibold tracking-[0.1em] uppercase"
              style={{ color: showBrakingZones ? 'rgba(239,68,68,0.9)' : 'rgba(148,163,184,0.4)' }}>
              BRAKING
            </span>
          </button>

          <button
            onClick={toggleGhostMode}
            className="flex items-center gap-1.5 px-2 py-1 rounded transition-all duration-200"
            style={{
              background: ghostModeEnabled ? 'rgba(52,211,153,0.1)' : 'transparent',
              border: `1px solid ${ghostModeEnabled ? 'rgba(52,211,153,0.3)' : 'rgba(148,163,184,0.1)'}`,
            }}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${ghostModeEnabled ? 'bg-emerald-400' : 'bg-slate-600'}`}
              style={ghostModeEnabled ? { boxShadow: '0 0 6px rgba(52,211,153,0.6)' } : {}} />
            <span className="text-[9px] font-semibold tracking-[0.1em] uppercase"
              style={{ color: ghostModeEnabled ? 'rgba(52,211,153,0.9)' : 'rgba(148,163,184,0.4)' }}>
              GHOST
            </span>
          </button>

          <div className="w-px h-3" style={{ background: 'rgba(148,163,184,0.15)' }} />

          <div className="flex items-center gap-1">
            {SPEEDS.map(s => (
              <button key={s} onClick={() => setPlaybackSpeed(s)}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all duration-150"
                style={{
                  color: playbackSpeed === s ? 'rgba(34,211,238,0.9)' : 'rgba(148,163,184,0.25)',
                  background: playbackSpeed === s ? 'rgba(34,211,238,0.08)' : 'transparent',
                  borderBottom: playbackSpeed === s ? '1px solid rgba(34,211,238,0.3)' : '1px solid transparent',
                }}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const PlaybackControls = memo(PlaybackControlsComponent);
