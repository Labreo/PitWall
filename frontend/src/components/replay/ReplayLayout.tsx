import React, { useMemo, useState, useEffect, useRef, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrackMap } from '../map/TrackMap';
import { TelemetryHUD } from './TelemetryHUD';
import { PlaybackControls } from './PlaybackControls';
import { CornerHUD } from './CornerHUD';
import { CoachingOverlay } from './CoachingOverlay';
import { useReplayEngine } from '../../hooks/useReplayEngine';
import { useReplayStore } from '../../store/replayStore';
import { MOCK_TELEMETRY, MOCK_SEGMENTS, MOCK_LAPS } from '../../utils/mockData';
import { TelemetryPoint, Segment, Lap } from '../../types/telemetry';
import { CornerAnalytics } from '../map/CornerIntelligenceLayer';
import { MOCK_COACHING_EVENTS } from '../../utils/mockCoachingEvents';

interface ReplayLayoutProps {
  telemetry?: TelemetryPoint[];
  segments?: Segment[];
  laps?: Lap[];
}

const ReplayLayoutComponent: React.FC<ReplayLayoutProps> = ({
  telemetry = MOCK_TELEMETRY,
  segments = MOCK_SEGMENTS,
  laps = MOCK_LAPS,
}) => {
  const engineRef = useReplayEngine(telemetry, segments, laps, MOCK_COACHING_EVENTS);
  const cornerAnalyticsRef = useRef<CornerAnalytics[]>([]);
  const [cornerAnalytics, setCornerAnalytics] = useState<CornerAnalytics[]>([]);

  const handleAnalyticsReady = useCallback((analytics: CornerAnalytics[]) => {
    cornerAnalyticsRef.current = analytics;
    setCornerAnalytics(analytics);
  }, []);

  // Use selective subscriptions to avoid unnecessary renders
  const currentSegmentId = useReplayStore(s => s.currentSegmentId);
  const currentLapNumber = useReplayStore(s => s.currentLapNumber);

  // ── Intro state ──
  const [introVisible, setIntroVisible] = useState(true);
  const [introPhase, setIntroPhase] = useState<'black' | 'sweep' | 'done'>('black');

  useEffect(() => {
    // Phase 1: hold black for 400ms
    const t1 = setTimeout(() => setIntroPhase('sweep'), 400);
    // Phase 2: sweep runs 1.8s (from CSS), hide intro after
    const t2 = setTimeout(() => {
      setIntroPhase('done');
      setIntroVisible(false);
    }, 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // ── Sector transition flash ──
  const [sectorFlash, setSectorFlash] = useState(false);
  const prevSegmentRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentSegmentId && currentSegmentId !== prevSegmentRef.current) {
      setSectorFlash(true);
      const t = setTimeout(() => setSectorFlash(false), 600);
      prevSegmentRef.current = currentSegmentId;
      return () => clearTimeout(t);
    }
    prevSegmentRef.current = currentSegmentId;
  }, [currentSegmentId]);

  // ── Lap change transition ──
  const [lapFlash, setLapFlash] = useState(false);
  const prevLapRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentLapNumber !== null && currentLapNumber !== prevLapRef.current && prevLapRef.current !== null) {
      setLapFlash(true);
      const t = setTimeout(() => setLapFlash(false), 1000);
      prevLapRef.current = currentLapNumber;
      return () => clearTimeout(t);
    }
    prevLapRef.current = currentLapNumber;
  }, [currentLapNumber]);

  const activeSegment = useMemo(() => {
    if (!currentSegmentId) return null;
    return segments.find(s => s.segment_id === currentSegmentId) ?? null;
  }, [currentSegmentId, segments]);

  const segmentsWithPath = useMemo(() => {
    return segments.map(seg => {
      const startIdx = telemetry.findIndex(t => t.timestamp >= seg.start_timestamp);
      const endIdx = telemetry.findIndex(t => t.timestamp > seg.end_timestamp);
      const slice = telemetry.slice(
        Math.max(0, startIdx),
        endIdx === -1 ? telemetry.length : endIdx
      );
      return {
        ...seg,
        gps_path: slice.map(t => ({ latitude: t.latitude, longitude: t.longitude })),
      };
    });
  }, [segments, telemetry]);

  return (
    <div className="w-full h-full relative scanline-overlay">

      {/* ═══════════════════════════════════
           INTRO SEQUENCE
           ═══════════════════════════════════ */}
      <AnimatePresence>
        {introVisible && (
          <>
            {/* Black overlay that fades out */}
            <motion.div
              key="intro-black"
              initial={{ opacity: 1 }}
              animate={{ opacity: introPhase === 'black' ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 z-[300] pointer-events-none"
              style={{ background: '#020408' }}
            />

            {/* Boot sequence terminal text — visible during black + sweep phases */}
            {(introPhase === 'black' || introPhase === 'sweep') && (
              <motion.div
                key="intro-boot"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 z-[310] pointer-events-none flex flex-col items-center justify-center gap-[6px]"
              >
                {[
                  { text: 'PITWALL TELEMETRY v2.1', delay: 0.05, col: 'rgba(34,211,238,0.9)', mono: true },
                  { text: '────────────────────────────────', delay: 0.15, col: 'rgba(34,211,238,0.15)', mono: true },
                  { text: 'LOADING SESSION  DONINGTON PARK GP', delay: 0.25, col: 'rgba(148,163,184,0.5)', mono: true },
                  { text: 'TELEMETRY POINTS  ████████████  OK', delay: 0.35, col: 'rgba(148,163,184,0.4)', mono: true },
                  { text: 'GPS TRACK DATA    ████████████  OK', delay: 0.45, col: 'rgba(148,163,184,0.4)', mono: true },
                  { text: 'SECTOR MAP        ████████████  OK', delay: 0.55, col: 'rgba(148,163,184,0.4)', mono: true },
                  { text: 'COACHING ENGINE   ████████████  OK', delay: 0.65, col: 'rgba(148,163,184,0.4)', mono: true },
                  { text: '────────────────────────────────', delay: 0.72, col: 'rgba(34,211,238,0.15)', mono: true },
                  { text: 'REPLAY READY', delay: 0.78, col: 'rgba(34,211,238,0.7)', mono: true },
                ].map(({ text, delay, col, mono }) => (
                  <motion.div
                    key={text}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay }}
                    className={`text-[10px] tracking-[0.18em] uppercase select-none${mono ? ' font-mono' : ''}`}
                    style={{ color: col }}
                  >
                    {text}
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Scanline sweep */}
            {introPhase === 'sweep' && (
              <div key="intro-sweep" className="intro-scanline" />
            )}
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════
           SECTOR FLASH
           ═══════════════════════════════════ */}
      <AnimatePresence>
        {sectorFlash && (
          <motion.div
            key="sector-flash"
            initial={{ opacity: 0.15 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-0 z-[90] pointer-events-none"
            style={{
              background: activeSegment?.segment_type === 'corner'
                ? 'radial-gradient(ellipse at center, rgba(248,113,113,0.08) 0%, transparent 60%)'
                : 'radial-gradient(ellipse at center, rgba(34,211,238,0.05) 0%, transparent 60%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════
           LAP CHANGE SWEEP
           ═══════════════════════════════════ */}
      <AnimatePresence>
        {lapFlash && (
          <>
            {/* Horizontal cyan line sweeps across */}
            <motion.div
              key="lap-line"
              initial={{ scaleX: 0, opacity: 1 }}
              animate={{ scaleX: 1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-1/2 left-0 right-0 h-[2px] z-[95] pointer-events-none origin-left"
              style={{
                background: 'linear-gradient(90deg, transparent, #22d3ee, transparent)',
                boxShadow: '0 0 30px rgba(34,211,238,0.4), 0 0 80px rgba(34,211,238,0.15)',
              }}
            />
            {/* Full-screen flash */}
            <motion.div
              key="lap-flash"
              initial={{ opacity: 0.12 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute inset-0 z-[94] pointer-events-none"
              style={{ background: 'rgba(34,211,238,0.04)' }}
            />
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════
           FULLSCREEN TRACK MAP
           ═══════════════════════════════════ */}
      <TrackMap
        telemetry={telemetry}
        segments={segmentsWithPath as any}
        engine={engineRef.current}
        onAnalyticsReady={handleAnalyticsReady}
        revealTrack={introPhase === 'done'}
      />

      {/* ── Atmospheric layers ── */}
      <div className="absolute inset-0 pointer-events-none vignette z-[45]" />
      <div className="absolute inset-0 pointer-events-none edge-fade-bottom z-[45]" />
      <div className="absolute inset-0 pointer-events-none edge-fade-top z-[45]" />

      {/* ── PITWALL watermark ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 1.8 }}
        className="absolute top-5 left-6 z-[60] flex items-center gap-2"
      >
        <div className="w-[3px] h-5 rounded-full rec-dot" style={{ background: 'rgba(34,211,238,0.5)', boxShadow: '0 0 8px rgba(34,211,238,0.3)' }} />
        <div>
          <div className="text-[11px] font-bold tracking-[0.15em]" style={{ color: 'rgba(226,232,240,0.7)' }}>
            PIT<span style={{ color: 'rgba(34,211,238,0.8)' }}>WALL</span>
          </div>
          <div className="text-[7px] font-medium tracking-[0.25em] uppercase" style={{ color: 'rgba(148,163,184,0.3)' }}>
            TELEMETRY REPLAY
          </div>
        </div>
      </motion.div>

      {/* ── Session badge ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 2.0 }}
        className="absolute top-5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-4"
      >
        <span className="text-[9px] font-semibold tracking-[0.2em] uppercase" style={{ color: 'rgba(148,163,184,0.35)' }}>
          DONINGTON PARK GP
        </span>
        <div className="w-px h-3" style={{ background: 'rgba(148,163,184,0.15)' }} />
        <span className="text-[9px] font-mono tracking-wider" style={{ color: 'rgba(148,163,184,0.25)' }}>
          29.08.2019
        </span>
      </motion.div>

      {/* ── Telemetry HUD ── */}
      <TelemetryHUD engine={engineRef.current} />

      {/* ── Corner Intelligence HUD ── */}
      <CornerHUD analytics={cornerAnalytics} />

      {/* ── Coaching Overlay ── */}
      <CoachingOverlay />

      {/* ── Corner Event Toast ── */}
      <AnimatePresence mode="wait">
        {activeSegment && activeSegment.segment_type === 'corner' && (
          <motion.div
            key={activeSegment.segment_id}
            initial={{ opacity: 0, x: 40, scale: 0.9, filter: 'blur(8px)' }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -30, scale: 0.95, filter: 'blur(4px)' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-16 right-8 z-[60]"
          >
            <div className="flex items-center gap-3">
              <div className="w-[3px] h-10 rounded-full" style={{
                background: 'linear-gradient(to bottom, #f87171, rgba(248,113,113,0.2))',
                boxShadow: '0 0 10px rgba(248,113,113,0.4)',
              }} />
              <div className="text-right">
                <div className="bc-label text-[8px] glow-red">{activeSegment.segment_id}</div>
                <div className="text-[13px] font-semibold text-slate-200 leading-tight -mt-0.5">
                  {activeSegment.classification}
                </div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(148,163,184,0.3)' }}>
                  {Math.abs(activeSegment.heading_change_degrees).toFixed(0)}° · {activeSegment.average_speed.toFixed(0)} km/h
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Playback Controls ── */}
      <PlaybackControls />
    </div>
  );
};

export const ReplayLayout = memo(ReplayLayoutComponent);
