import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReplayEngine } from '../../engine/ReplayEngine';
import { useReplayStore } from '../../store/replayStore';

interface TelemetryHUDProps {
  engine: ReplayEngine | null;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({ engine }) => {
  const speedRef = useRef<HTMLSpanElement>(null);
  const speedUnitRef = useRef<HTMLSpanElement>(null);
  const gDotRef = useRef<HTMLDivElement>(null);
  const gValRef = useRef<HTMLSpanElement>(null);
  const deltaRef = useRef<HTMLSpanElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const speedBarRef = useRef<HTMLDivElement>(null);

  const currentSegment = useReplayStore(s => s.currentSegmentId);
  const currentLap = useReplayStore(s => s.currentLapNumber);

  useEffect(() => {
    if (!engine) return;
    const unsub = engine.subscribe((p) => {
      const spd = Math.round(p.speed_kmh);
      if (speedRef.current) speedRef.current.textContent = spd.toString().padStart(3, '\u00A0');
      if (speedBarRef.current) {
        const pct = Math.min(p.speed_kmh / 200, 1);
        speedBarRef.current.style.width = `${pct * 100}%`;
        speedBarRef.current.style.opacity = `${0.4 + pct * 0.6}`;
      }

      // G-force
      const gTotal = Math.sqrt(p.accel_x ** 2 + p.accel_y ** 2);
      if (gValRef.current) gValRef.current.textContent = gTotal.toFixed(1);
      if (gDotRef.current) {
        const x = Math.max(-1, Math.min(1, p.accel_y / 2)) * 18;
        const y = Math.max(-1, Math.min(1, -p.accel_x / 2)) * 18;
        gDotRef.current.style.transform = `translate(${x}px, ${y}px)`;
      }

      if (deltaRef.current) {
        const d = p.timestamp / 1000;
        deltaRef.current.textContent = `+${d.toFixed(1)}`;
      }
      if (altRef.current) altRef.current.textContent = p.altitude.toFixed(0);
    });
    return unsub;
  }, [engine]);

  return (
    <>
      {/* ── SPEED: Bottom-left broadcast overlay ── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="absolute bottom-24 left-8 z-[60]"
      >
        <div className="flex items-end gap-1">
          <span ref={speedRef} className="bc-value text-[72px] glow-cyan leading-none tracking-tighter">  0</span>
          <div className="flex flex-col mb-2 ml-1">
            <span className="bc-label text-[8px]" style={{ color: 'rgba(34,211,238,0.4)' }}>KM/H</span>
          </div>
        </div>
        {/* Speed bar — thin horizontal line */}
        <div className="w-48 h-[2px] mt-2 rounded-full overflow-hidden" style={{ background: 'rgba(34,211,238,0.06)' }}>
          <div ref={speedBarRef} className="h-full rounded-full" style={{
            width: '0%',
            background: 'linear-gradient(90deg, #22d3ee, #34d399, #fbbf24, #f87171)',
            transition: 'width 60ms linear',
          }} />
        </div>
      </motion.div>

      {/* ── G-FORCE: Bottom-left, above speed ── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
        className="absolute bottom-52 left-8 z-[60] flex items-center gap-4"
      >
        {/* G circle */}
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border border-slate-700/30" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-px" style={{ background: 'rgba(148,163,184,0.08)' }} />
          <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-px" style={{ background: 'rgba(148,163,184,0.08)' }} />
          <div ref={gDotRef} className="absolute w-2 h-2 rounded-full top-1/2 left-1/2 -translate-x-1 -translate-y-1"
            style={{ background: '#fbbf24', boxShadow: '0 0 6px rgba(251,191,36,0.6)' }} />
        </div>
        <div>
          <span className="bc-label text-[8px]">G-FORCE</span>
          <div className="flex items-baseline gap-0.5 -mt-0.5">
            <span ref={gValRef} className="bc-value text-lg glow-amber">0.0</span>
            <span className="text-[9px]" style={{ color: 'rgba(251,191,36,0.3)' }}>G</span>
          </div>
        </div>
      </motion.div>

      {/* ── DELTA: Top-right corner ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        className="absolute top-6 right-8 z-[60] text-right"
      >
        <span className="bc-label">DELTA</span>
        <div className="-mt-0.5">
          <span ref={deltaRef} className="bc-value text-3xl glow-emerald">+0.0</span>
          <span className="text-xs ml-0.5" style={{ color: 'rgba(52,211,153,0.3)' }}>s</span>
        </div>
      </motion.div>

      {/* ── LAP + SECTOR: Bottom-right ── */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
        className="absolute bottom-24 right-8 z-[60] text-right"
      >
        <span className="bc-label">LAP</span>
        <div className="bc-value text-4xl text-slate-200 -mt-1 tracking-tight">{currentLap ?? '—'}</div>
        <div className="mt-2">
          <span className="bc-label">SECTOR</span>
          <div className="bc-value text-lg glow-red -mt-0.5">{currentSegment ?? '—'}</div>
        </div>
      </motion.div>

      {/* ── ALT: Tiny, bottom-right secondary ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-52 right-8 z-[60] text-right"
      >
        <span className="bc-label text-[8px]">ALT</span>
        <div className="flex items-baseline justify-end gap-0.5 -mt-0.5">
          <span ref={altRef} className="bc-value text-sm text-slate-400">0</span>
          <span className="text-[9px] text-slate-600">m</span>
        </div>
      </motion.div>
    </>
  );
};
