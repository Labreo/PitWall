import React, { useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReplayEngine } from '../../engine/ReplayEngine';
import { TelemetryPoint } from '../../types/telemetry';
import { useCoachingStore } from '../../store/coachingStore';

interface TelemetryHUDProps {
  engine: ReplayEngine | null;
}

function speedColor(speed: number): string {
  if (speed > 160) return '#f87171';
  if (speed > 120) return '#fbbf24';
  if (speed > 60)  return '#34d399';
  return '#22d3ee';
}

function gpsBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => d * Math.PI / 180;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
             Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

function bearingLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

/**
 * TelemetryHUD — left-side only panels: Speed, G-Force, Heading.
 * Right-side panels (ALT, VS BEST LAP, LAP, SECTOR) live in ReplayLayout.
 */
const TelemetryHUDComponent: React.FC<TelemetryHUDProps> = ({ engine }) => {
  const speedRef         = useRef<HTMLSpanElement>(null);
  const speedContainerRef= useRef<HTMLDivElement>(null);
  const gDotRef          = useRef<HTMLDivElement>(null);
  const gValRef          = useRef<HTMLSpanElement>(null);
  const gRingRef         = useRef<HTMLDivElement>(null);
  const speedBarRef      = useRef<HTMLDivElement>(null);
  const speedGlowRef     = useRef<HTMLDivElement>(null);
  const headingNeedleRef = useRef<HTMLDivElement>(null);
  const headingDegRef    = useRef<HTMLSpanElement>(null);
  const headingLabelRef  = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!engine) return;
    let prevPoint: TelemetryPoint | null = null;

    const unsub = engine.subscribe((p) => {
      const spd = Math.round(p.speed_kmh);

      // ── Speed number ──
      if (speedRef.current) {
        speedRef.current.textContent = spd.toString().padStart(3, ' ');
      }
      if (speedContainerRef.current) {
        speedContainerRef.current.style.color = speedColor(p.speed_kmh);
      }

      // ── Ambient speed glow ──
      if (speedGlowRef.current) {
        const intensity = Math.min(p.speed_kmh / 200, 1);
        const col = speedColor(p.speed_kmh);
        speedGlowRef.current.style.opacity = `${intensity * 0.4}`;
        speedGlowRef.current.style.background = `radial-gradient(circle, ${col} 0%, transparent 70%)`;
        speedGlowRef.current.style.transform = `scale(${0.6 + intensity * 0.6})`;
      }

      // ── Speed bar ──
      if (speedBarRef.current) {
        const pct = Math.min(p.speed_kmh / 200, 1);
        speedBarRef.current.style.width = `${pct * 100}%`;
        speedBarRef.current.style.opacity = `${0.4 + pct * 0.6}`;
        speedBarRef.current.style.boxShadow = pct > 0.6
          ? `0 0 ${6 + pct * 8}px ${speedColor(p.speed_kmh)}40`
          : 'none';
      }

      // ── G-force (derived from GPS speed/heading changes) ──
      const gLat = p.accel_y;   // Lateral G (cornering)
      const gLon = p.accel_x;   // Longitudinal G (braking/accel)
      const gTotal = Math.sqrt(gLon ** 2 + gLat ** 2);
      
      if (gValRef.current) gValRef.current.textContent = gTotal.toFixed(1);
      if (gDotRef.current) {
        // Map G values to pixel displacement within the circle
        // Max expected ~2.0G → full deflection to edge
        const maxG = 2.0;
        const x = Math.max(-1, Math.min(1, gLat / maxG)) * 16;
        const y = Math.max(-1, Math.min(1, -gLon / maxG)) * 16;
        gDotRef.current.style.transform = `translate(${x}px, ${y}px)`;
        
        // Dot grows under high G
        const dotSize = 6 + Math.min(gTotal, 2.5) * 4;
        gDotRef.current.style.width = `${dotSize}px`;
        gDotRef.current.style.height = `${dotSize}px`;
        
        // Color shift: amber → red under heavy G
        const dotColor = gTotal > 1.2 ? '#f87171' : '#fbbf24';
        gDotRef.current.style.background = dotColor;
        gDotRef.current.style.boxShadow = `0 0 ${4 + gTotal * 8}px ${dotColor}${Math.round((0.4 + gTotal * 0.2) * 255).toString(16).padStart(2, '0')}`;
      }
      if (gRingRef.current) {
        gRingRef.current.style.borderColor = gTotal > 1.0
          ? `rgba(248,113,113,${0.15 + Math.min(gTotal, 2) * 0.15})`
          : 'rgba(100,116,139,0.15)';
      }

      // ── Heading (GPS bearing from prev→current) ──
      if (prevPoint && (Math.abs(p.latitude - prevPoint.latitude) > 1e-7 || Math.abs(p.longitude - prevPoint.longitude) > 1e-7)) {
        const bearing = gpsBearing(prevPoint.latitude, prevPoint.longitude, p.latitude, p.longitude);
        if (headingNeedleRef.current) {
          headingNeedleRef.current.style.transform = `rotate(${bearing}deg)`;
        }
        if (headingDegRef.current) {
          headingDegRef.current.textContent = Math.round(bearing).toString().padStart(3, '0') + '°';
        }
        if (headingLabelRef.current) {
          headingLabelRef.current.textContent = bearingLabel(bearing);
        }
      }
      prevPoint = p;
    });

    return unsub;
  }, [engine]);

  const activeEvent = useCoachingStore((state) => state.activeEvent);

  return (
    <>
      {/* ── Radio Activity: Top-left ── */}
      <AnimatePresence>
        {activeEvent && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-24 left-8 z-[60] flex items-center gap-3"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Engineer Radio</span>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: [4, 12, 4] }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 0.6, 
                        delay: i * 0.1,
                        ease: "easeInOut" 
                      }}
                      className="w-0.5 bg-cyan-400"
                    />
                  ))}
                </div>
                <span className="text-[10px] font-mono text-cyan-400/80">TX ACTIVE</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SPEED: Bottom-left ── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="absolute bottom-24 left-8 z-[60]"
      >
        <div ref={speedGlowRef} className="absolute -inset-8 pointer-events-none rounded-full transition-all duration-200"
          style={{ opacity: 0, filter: 'blur(30px)' }} />

        <div className="relative flex items-end gap-1">
          <div ref={speedContainerRef} className="bc-value text-[72px] leading-none tracking-tighter" style={{ color: '#22d3ee' }}>
            <span ref={speedRef}>&nbsp;&nbsp;0</span>
          </div>
          <div className="flex flex-col mb-2 ml-1">
            <span className="bc-label text-[8px]" style={{ color: 'rgba(34,211,238,0.4)' }}>KM/H</span>
          </div>
        </div>
        {/* Speed bar */}
        <div className="w-48 h-[2px] mt-2 rounded-full overflow-hidden" style={{ background: 'rgba(34,211,238,0.06)' }}>
          <div ref={speedBarRef} className="h-full rounded-full" style={{
            width: '0%',
            background: 'linear-gradient(90deg, #22d3ee, #34d399, #fbbf24, #f87171)',
            transition: 'width 75ms linear',
          }} />
        </div>
      </motion.div>

      {/* ── G-FORCE & HEADING ── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
        className="absolute bottom-52 left-8 z-[60] flex items-center gap-8"
      >
        {/* G-FORCE */}
        <div className="flex items-center gap-4">
          <div ref={gRingRef} className="relative w-10 h-10" style={{ border: '1px solid rgba(100,116,139,0.15)', borderRadius: '50%' }}>
            <div className="absolute inset-0 rounded-full" style={{ border: '1px solid rgba(100,116,139,0.15)' }} />
            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-px" style={{ background: 'rgba(148,163,184,0.06)' }} />
            <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-px" style={{ background: 'rgba(148,163,184,0.06)' }} />
            <div ref={gDotRef} className="absolute rounded-full top-1/2 left-1/2 -translate-x-1 -translate-y-1"
              style={{ width: 8, height: 8, background: '#fbbf24', boxShadow: '0 0 6px rgba(251,191,36,0.6)', transition: 'width 75ms, height 75ms' }} />
          </div>
          <div>
            <span className="bc-label text-[8px]">G-FORCE</span>
            <div className="flex items-baseline gap-0.5 -mt-0.5">
              <span ref={gValRef} className="bc-value text-lg glow-amber">0.0</span>
              <span className="text-[9px]" style={{ color: 'rgba(251,191,36,0.3)' }}>G</span>
            </div>
          </div>
        </div>

        {/* HEADING COMPASS */}
        <div className="flex items-center gap-4">
          <div className="relative w-10 h-10 flex items-center justify-center"
            style={{ border: '1px solid rgba(34,211,238,0.12)', borderRadius: '50%' }}
          >
            {[0, 90, 180, 270].map(deg => (
              <div key={deg} className="absolute w-px h-1.5 rounded-full"
                style={{
                  background: 'rgba(34,211,238,0.25)',
                  top: deg === 0 ? 1 : deg === 180 ? 'auto' : '50%',
                  bottom: deg === 180 ? 1 : 'auto',
                  left: deg === 270 ? 1 : deg === 90 ? 'auto' : '50%',
                  right: deg === 90 ? 1 : 'auto',
                  transform: (deg === 0 || deg === 180) ? 'translateX(-50%)' : 'translateY(-50%)',
                  width: (deg === 90 || deg === 270) ? '8px' : '1px',
                  height: (deg === 0 || deg === 180) ? '8px' : '1px',
                }}
              />
            ))}
            <div ref={headingNeedleRef} className="absolute inset-0 flex items-start justify-center" style={{ transition: 'transform 120ms linear' }}>
              <div className="w-px h-4 mt-0.5 rounded-full" style={{ background: '#22d3ee', boxShadow: '0 0 4px rgba(34,211,238,0.6)' }} />
            </div>
          </div>
          <div>
            <span className="bc-label text-[8px]">HEADING</span>
            <div className="flex items-baseline gap-1 -mt-0.5">
              <span ref={headingDegRef} className="bc-value text-lg font-mono" style={{ color: 'rgba(34,211,238,0.7)' }}>000°</span>
              <span ref={headingLabelRef} className="text-[9px] font-bold tracking-wider" style={{ color: 'rgba(34,211,238,0.35)' }}>N</span>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export const TelemetryHUD = memo(TelemetryHUDComponent);
