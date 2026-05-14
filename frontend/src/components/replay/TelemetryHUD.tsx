import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ReplayEngine } from '../../engine/ReplayEngine';
import { useReplayStore } from '../../store/replayStore';

interface TelemetryHUDProps {
  engine: ReplayEngine | null;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({ engine }) => {
  const speedRef = useRef<HTMLSpanElement>(null);
  const speedBarRef = useRef<HTMLDivElement>(null);
  const gForceXRef = useRef<HTMLSpanElement>(null);
  const gForceYRef = useRef<HTMLSpanElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const deltaRef = useRef<HTMLSpanElement>(null);
  const gDotRef = useRef<HTMLDivElement>(null);
  const currentSegment = useReplayStore(state => state.currentSegmentId);
  const currentLap = useReplayStore(state => state.currentLapNumber);

  useEffect(() => {
    if (!engine) return;

    const unsubscribe = engine.subscribe((point) => {
      // Speed
      const speed = Math.round(point.speed_kmh);
      if (speedRef.current) speedRef.current.innerText = speed.toString();

      // Speed bar fill
      if (speedBarRef.current) {
        const pct = Math.min(point.speed_kmh / 200, 1) * 100;
        speedBarRef.current.style.width = `${pct}%`;
        // Color transition based on speed
        if (pct > 80) speedBarRef.current.style.background = 'linear-gradient(90deg, #22d3ee, #f87171)';
        else if (pct > 50) speedBarRef.current.style.background = 'linear-gradient(90deg, #22d3ee, #fbbf24)';
        else speedBarRef.current.style.background = 'linear-gradient(90deg, #22d3ee, #34d399)';
      }

      // G-force
      if (gForceXRef.current) gForceXRef.current.innerText = point.accel_x.toFixed(1);
      if (gForceYRef.current) gForceYRef.current.innerText = point.accel_y.toFixed(1);

      // G-force dot position (maps -2..2 G to pixel range)
      if (gDotRef.current) {
        const x = Math.max(-1, Math.min(1, point.accel_y / 2)) * 32 + 32;
        const y = Math.max(-1, Math.min(1, -point.accel_x / 2)) * 32 + 32;
        gDotRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }

      // Altitude
      if (altRef.current) altRef.current.innerText = point.altitude.toFixed(0);

      // Delta (mock: show time offset from session start)
      if (deltaRef.current) {
        const delta = point.timestamp / 1000;
        const sign = delta >= 0 ? '+' : '';
        deltaRef.current.innerText = `${sign}${delta.toFixed(1)}`;
      }
    });

    return unsubscribe;
  }, [engine]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel-bright rounded-2xl p-5 flex gap-6 items-stretch"
    >
      {/* ── Speedometer ── */}
      <div className="flex flex-col items-center min-w-[140px]">
        <span className="label-micro mb-2">SPEED</span>
        <div className="flex items-baseline gap-1">
          <span ref={speedRef} className="label-data text-5xl glow-text-cyan leading-none">0</span>
          <span className="text-sm text-cyan-800/60 font-light">km/h</span>
        </div>
        {/* Speed bar */}
        <div className="w-full h-1 bg-slate-800 rounded-full mt-3 overflow-hidden">
          <div ref={speedBarRef} className="h-full rounded-full transition-[width] duration-75" style={{ width: '0%', background: 'linear-gradient(90deg, #22d3ee, #34d399)' }} />
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="w-px bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent" />

      {/* ── G-Force ── */}
      <div className="flex flex-col items-center min-w-[100px]">
        <span className="label-micro mb-2">G-FORCE</span>
        <div className="relative w-16 h-16 rounded-full border border-slate-700/50 bg-slate-900/50">
          {/* Crosshairs */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-700/30" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-700/30" />
          {/* Dot */}
          <div ref={gDotRef} className="absolute top-0 left-0 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" style={{ transform: 'translate(32px, 32px)' }} />
        </div>
        <div className="flex gap-3 mt-2 text-xs font-mono">
          <span className="text-slate-500">LAT <span ref={gForceYRef} className="text-amber-400">0.0</span></span>
          <span className="text-slate-500">LON <span ref={gForceXRef} className="text-amber-400">0.0</span></span>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="w-px bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent" />

      {/* ── Delta + Alt ── */}
      <div className="flex flex-col items-center min-w-[80px] justify-center">
        <span className="label-micro mb-1">DELTA</span>
        <span ref={deltaRef} className="label-data text-2xl glow-text-emerald leading-none">+0.0</span>
        <div className="mt-3">
          <span className="label-micro">ALT</span>
          <div className="flex items-baseline gap-0.5 mt-0.5">
            <span ref={altRef} className="label-data text-sm text-slate-300">0</span>
            <span className="text-xs text-slate-600">m</span>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="w-px bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent" />

      {/* ── Sector / Lap info ── */}
      <div className="flex flex-col items-center min-w-[80px] justify-center">
        <span className="label-micro mb-1">LAP</span>
        <span className="label-data text-2xl text-slate-200">{currentLap ?? '—'}</span>
        <div className="mt-3">
          <span className="label-micro">SECTOR</span>
          <span className="label-data text-sm text-red-400 ml-1">{currentSegment ?? '—'}</span>
        </div>
      </div>
    </motion.div>
  );
};
