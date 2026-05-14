import React from 'react';
import { motion } from 'framer-motion';
import { useReplayStore } from '../../store/replayStore';
import { Play, Pause } from 'lucide-react';

const SPEEDS = [0.25, 0.5, 1, 2, 4];

export const PlaybackControls: React.FC = () => {
  const {
    isPlaying, togglePlay, playbackSpeed, setPlaybackSpeed,
    currentTimestamp, sessionStart, sessionEnd, seekTo,
  } = useReplayStore();

  const total = (sessionEnd - sessionStart) / 1000;
  const elapsed = (currentTimestamp - sessionStart) / 1000;
  const progress = total > 0 ? ((currentTimestamp - sessionStart) / (sessionEnd - sessionStart)) * 100 : 0;

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 10);
    return `${m}:${sec.toString().padStart(2, '0')}.${ms}`;
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(sessionStart + (parseFloat(e.target.value) / 100) * (sessionEnd - sessionStart));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="absolute bottom-0 left-0 right-0 z-[70] px-6 pb-4 pt-8 pointer-events-auto"
    >
      {/* Timeline bar */}
      <div className="flex items-center gap-3 mb-2.5">
        <span className="bc-value text-[11px] w-12 text-right tabular-nums" style={{ color: 'rgba(34,211,238,0.6)' }}>
          {fmt(elapsed)}
        </span>

        <div className="relative flex-1 group">
          {/* Glow fill */}
          <div className="absolute top-1/2 left-0 h-[2px] -translate-y-[1px] rounded-full pointer-events-none" style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, rgba(34,211,238,0.7), rgba(52,211,153,0.5))',
            boxShadow: '0 0 8px rgba(34,211,238,0.25)',
          }} />
          <input
            type="range" className="timeline-slider" min={0} max={100} step={0.05}
            value={progress} onChange={handleScrub}
          />
        </div>

        <span className="bc-value text-[11px] w-12 tabular-nums" style={{ color: 'rgba(148,163,184,0.3)' }}>
          {fmt(total)}
        </span>
      </div>

      {/* Controls row — minimal */}
      <div className="flex items-center justify-between">
        {/* Play */}
        <div className="flex items-center gap-3">
          <button onClick={togglePlay}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background: isPlaying ? 'rgba(34,211,238,0.06)' : 'rgba(34,211,238,0.1)',
              border: `1px solid rgba(34,211,238,${isPlaying ? 0.15 : 0.25})`,
              boxShadow: isPlaying ? 'none' : '0 0 16px rgba(34,211,238,0.1)',
            }}
          >
            {isPlaying
              ? <Pause size={14} style={{ color: 'rgba(34,211,238,0.8)' }} />
              : <Play size={14} style={{ color: '#22d3ee', marginLeft: 1 }} />
            }
          </button>

          {/* Status */}
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 rec-dot' : 'bg-slate-700'}`}
              style={isPlaying ? { boxShadow: '0 0 6px rgba(52,211,153,0.5)' } : {}} />
            <span className="text-[9px] font-semibold tracking-[0.2em] uppercase"
              style={{ color: isPlaying ? 'rgba(52,211,153,0.6)' : 'rgba(100,116,139,0.4)' }}>
              {isPlaying ? 'REPLAY' : 'PAUSED'}
            </span>
          </div>
        </div>

        {/* Speed */}
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
    </motion.div>
  );
};
