import React from 'react';
import { motion } from 'framer-motion';
import { useReplayStore } from '../../store/replayStore';
import { Play, Pause, SkipForward, SkipBack, ChevronRight } from 'lucide-react';

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4];

export const PlaybackControls: React.FC = () => {
  const {
    isPlaying, togglePlay, playbackSpeed, setPlaybackSpeed,
    currentTimestamp, sessionStart, sessionEnd, seekTo,
  } = useReplayStore();

  const elapsed = ((currentTimestamp - sessionStart) / 1000);
  const total = ((sessionEnd - sessionStart) / 1000);
  const progress = total > 0 ? ((currentTimestamp - sessionStart) / (sessionEnd - sessionStart)) * 100 : 0;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = parseFloat(e.target.value);
    const ts = sessionStart + (pct / 100) * (sessionEnd - sessionStart);
    seekTo(ts);
  };

  const handleSkip = (deltaMs: number) => {
    const ts = Math.max(sessionStart, Math.min(sessionEnd, currentTimestamp + deltaMs));
    seekTo(ts);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel-bright rounded-2xl px-6 py-4"
    >
      {/* ── Timeline ── */}
      <div className="flex items-center gap-3 mb-3">
        <span className="label-data text-xs text-cyan-400 w-14 text-right tabular-nums">{formatTime(elapsed)}</span>

        <div className="relative flex-1">
          {/* Progress fill */}
          <div className="absolute top-1/2 left-0 h-1 rounded-full -translate-y-1/2 pointer-events-none z-0" style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #22d3ee, #34d399)',
            boxShadow: '0 0 12px rgba(34,211,238,0.3)',
          }} />
          <input
            type="range"
            className="timeline-slider relative z-10"
            min={0} max={100} step={0.1}
            value={progress}
            onChange={handleScrub}
          />
        </div>

        <span className="label-data text-xs text-slate-500 w-14 tabular-nums">{formatTime(total)}</span>
      </div>

      {/* ── Controls Row ── */}
      <div className="flex items-center justify-between">
        {/* Transport */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSkip(-5000)}
            className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all duration-200"
          >
            <SkipBack size={14} />
          </button>

          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200"
            style={{
              background: isPlaying
                ? 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(34,211,238,0.05))'
                : 'linear-gradient(135deg, rgba(34,211,238,0.25), rgba(34,211,238,0.1))',
              border: `1px solid ${isPlaying ? 'rgba(34,211,238,0.3)' : 'rgba(34,211,238,0.4)'}`,
              boxShadow: isPlaying ? 'none' : '0 0 20px rgba(34,211,238,0.15)',
            }}
          >
            {isPlaying
              ? <Pause size={20} className="text-cyan-400" />
              : <Play size={20} className="text-cyan-400 ml-0.5" />
            }
          </button>

          <button
            onClick={() => handleSkip(5000)}
            className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all duration-200"
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1">
          <span className="label-micro mr-2">SPEED</span>
          {SPEED_OPTIONS.map(spd => (
            <button
              key={spd}
              onClick={() => setPlaybackSpeed(spd)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-all duration-200 ${
                playbackSpeed === spd
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.15)]'
                  : 'text-slate-500 border border-transparent hover:text-slate-300 hover:border-slate-700/50'
              }`}
            >
              {spd}×
            </button>
          ))}
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse' : 'bg-slate-600'}`} />
          <span className="label-micro">{isPlaying ? 'LIVE REPLAY' : 'PAUSED'}</span>
        </div>
      </div>
    </motion.div>
  );
};
