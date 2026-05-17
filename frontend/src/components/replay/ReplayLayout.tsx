import React, { useMemo, useState, useEffect, useRef, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrackMap } from '../map/TrackMap';
import { TelemetryHUD } from './TelemetryHUD';
import { PlaybackControls } from './PlaybackControls';
import { CornerHUD } from './CornerHUD';
import { CoachingOverlay } from './CoachingOverlay';
import { VideoBackground } from './VideoBackground';
import { useReplayEngine } from '../../hooks/useReplayEngine';
import { useReplayStore } from '../../store/replayStore';
import { MOCK_TELEMETRY, MOCK_SEGMENTS, MOCK_LAPS } from '../../utils/mockData';
import { TelemetryPoint, Segment, Lap } from '../../types/telemetry';
import { CornerAnalytics } from '../map/CornerIntelligenceLayer';
import { CoachingSubtitles } from './CoachingSubtitles';

import { EngineerRadioDebugPanel } from './EngineerRadioDebugPanel';
import { SplitTimingHUD } from './SplitTimingHUD';
import { coachingAudioQueue } from '../../engine/coachingAudioQueue';
import { CoachingEvent } from '../../types/coaching';
import { selectBestSegments } from '../../utils/theoreticalSegmentSelector';
import { assembleTheoreticalLap } from '../../utils/theoreticalLapAssembler';
import { FinalSessionSummary } from './FinalSessionSummary';
import { buildSessionSummary } from '../../utils/summaryMetricsBuilder';
import { TheoreticalReplayHUD } from './TheoreticalReplayHUD';
import { DiagnosticOverlay } from './DiagnosticOverlay';
import { MicroGhostDeltaMeter } from './MicroGhostDeltaMeter';

interface ReplayLayoutProps {
  telemetry?: TelemetryPoint[];
  segments?: Segment[];
  laps?: Lap[];
  coachingEvents?: CoachingEvent[];
  sessionInfo?: { filename: string; date: string } | null;
}

const ReplayLayoutComponent: React.FC<ReplayLayoutProps> = ({
  telemetry = MOCK_TELEMETRY,
  segments = MOCK_SEGMENTS,
  laps = MOCK_LAPS,
  coachingEvents = [],
  sessionInfo = null,
}) => {
  const engineRef = useReplayEngine(telemetry, segments, laps, coachingEvents);


  const initializeSession = useReplayStore(s => s.initializeSession);
  useEffect(() => {
    initializeSession(telemetry, laps, segments);
  }, [telemetry, laps, segments, initializeSession]);

  const handleInteraction = () => {
    coachingAudioQueue.unlock();
  };

  const cornerAnalyticsRef = useRef<CornerAnalytics[]>([]);
  const [cornerAnalytics, setCornerAnalytics] = useState<CornerAnalytics[]>([]);

  const handleAnalyticsReady = useCallback((analytics: CornerAnalytics[]) => {
    cornerAnalyticsRef.current = analytics;
    setCornerAnalytics(analytics);
  }, []);

  // Use selective subscriptions to avoid unnecessary renders
  const currentSegmentId = useReplayStore(s => s.currentSegmentId);
  const currentLapNumber = useReplayStore(s => s.currentLapNumber);
  const ghostModeEnabled = useReplayStore(s => s.ghostModeEnabled);
  const showSummary = useReplayStore(s => s.showSummary);

  const summaryData = useMemo(() => {
    return buildSessionSummary(
      telemetry,
      laps,
      segments,
      coachingEvents
    );
  }, [telemetry, laps, segments, coachingEvents]);


  const [theoreticalOverlay, setTheoreticalOverlay] = useState(false);
  const setTheoreticalLapData = useReplayStore(s => s.setTheoreticalLapData);
  const setTheoreticalReplayActive = useReplayStore(s => s.setTheoreticalReplayActive);
  const seekTo = useReplayStore(s => s.seekTo);
  const togglePlay = useReplayStore(s => s.togglePlay);
  const setPlaybackSpeed = useReplayStore(s => s.setPlaybackSpeed);

  // Sync engine telemetry when mode changes
  useEffect(() => {
    const unsub = useReplayStore.subscribe((state, prevState) => {
      if (state.isTheoreticalReplayActive !== prevState.isTheoreticalReplayActive) {
        if (engineRef.current) {
          if (state.isTheoreticalReplayActive && state.theoreticalLapData) {
            engineRef.current.setTelemetry(state.theoreticalLapData.telemetry, [], []);
          } else {
            engineRef.current.setTelemetry(state.initialTelemetry, state.initialLaps, state.initialSegments);
          }
        }
      }
    });
    return unsub;
  }, [engineRef.current]);

  // Imperative refs for top-right readout (avoid React re-renders)
  const altRef = useRef<HTMLSpanElement>(null);
  const ghostGapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const unsub = engine.subscribe((pt, ghostPt, ghostTimeDeltaMs) => {
      if (altRef.current) altRef.current.textContent = pt.altitude.toFixed(0);
      if (ghostGapRef.current) {
        if (ghostPt !== null) {
          const deltaS = (ghostTimeDeltaMs ?? 0) / 1000;
          ghostGapRef.current.textContent = deltaS >= 0 ? `+${deltaS.toFixed(2)}` : deltaS.toFixed(2);
          ghostGapRef.current.style.color = deltaS >= 0 ? '#f87171' : '#34d399';
          ghostGapRef.current.style.opacity = '1';
        } else {
          ghostGapRef.current.textContent = '--.--';
          ghostGapRef.current.style.color = 'rgba(148,163,184,0.3)';
        }
      }

      // Auto-trigger logic
      const { sessionEnd, showSummary, toggleSummary, isTheoreticalReplayActive } = useReplayStore.getState();
      
      const isNearEnd = pt.timestamp >= sessionEnd - 100;

      if (isNearEnd && !showSummary) {
        if (!isTheoreticalReplayActive) {
          const bestSectors = selectBestSegments(telemetry, laps, segments);
          
          // Safety Check: If we can't build a theoretical lap, skip to summary
          if (bestSectors.length < 2) {
            toggleSummary();
            return;
          }

          // Case 1: Raw Replay Ends -> Launch Theoretical Best Lap
          setPlaybackSpeed(0.25);
          
          setTimeout(() => {
            setTheoreticalOverlay(true);
            const tLap = assembleTheoreticalLap(telemetry, bestSectors);
            setTheoreticalLapData(tLap);
            
            setTimeout(() => {
              setTheoreticalOverlay(false);
              
              // Trigger state change (subscription will handle engine swap)
              useReplayStore.setState({ 
                isTheoreticalReplayActive: true,
                sessionStart: 0, 
                sessionEnd: tLap.totalDurationMs,
                currentTimestamp: 0,
                isPlaying: true
              });
              setPlaybackSpeed(1.0);
            }, 3000);
          }, 1500);
        } else {
          // Case 2: Theoretical Best Lap Ends -> Launch Intelligence Summary
          toggleSummary();
        }
      }
    });
    return unsub;
  }, [engineRef.current]);

  // ── Intro state ──
  const [introVisible, setIntroVisible] = useState(true);
  const [introPhase, setIntroPhase] = useState<'black' | 'sweep' | 'done'>('black');
  const [revealTrack, setRevealTrack] = useState(false);

  useEffect(() => {
    // Phase 1: hold black for 400ms
    const t1 = setTimeout(() => setIntroPhase('sweep'), 400);
    // Phase 2: sweep runs 1.8s, hide intro
    const t2 = setTimeout(() => {
      setIntroPhase('done');
      setIntroVisible(false);
    }, 2400);
    // Phase 3: reveal track 200ms after intro clears (ensures SVG is in DOM)
    const t3 = setTimeout(() => setRevealTrack(true), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
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

  // ── Demo Hotkeys ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'D') {
        useReplayStore.getState().toggleDiagnostics();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div 
      className="w-full h-full relative scanline-overlay"
      onClick={handleInteraction}
    >
      <EngineerRadioDebugPanel />
      <DiagnosticOverlay />

      {/* ── Driving footage background ── */}
      <VideoBackground />

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
                  { text: `LOADING SESSION  ${(sessionInfo?.filename || 'DONINGTON PARK GP').toUpperCase()}`, delay: 0.25, col: 'rgba(148,163,184,0.5)', mono: true },
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
        laps={laps}
        engine={engineRef.current}
        onAnalyticsReady={handleAnalyticsReady}
        revealTrack={revealTrack}
      />

      {/* ── Atmospheric layers ── */}
      <div className="absolute inset-0 pointer-events-none vignette z-[45]" />
      <div className="absolute inset-0 pointer-events-none edge-fade-bottom z-[45]" />

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
          {sessionInfo?.filename || 'DONINGTON PARK GP'}
        </span>
        <div className="w-px h-3" style={{ background: 'rgba(148,163,184,0.15)' }} />
        <span className="text-[9px] font-mono tracking-wider" style={{ color: 'rgba(148,163,184,0.25)' }}>
          {sessionInfo?.date || '29.08.2019'}
        </span>
      </motion.div>

      {/* ── DELTA & GHOST GAP ── top-right corner ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        className="absolute top-6 right-8 z-[60] text-right"
      >
        <span className="bc-label" style={{ color: 'rgba(148,163,184,0.3)' }}>ALT</span>
        <div className="-mt-0.5">
          <span ref={altRef} className="bc-value text-2xl" style={{ color: 'rgba(226,232,240,0.45)' }}>0</span>
          <span className="text-[10px] ml-0.5" style={{ color: 'rgba(148,163,184,0.2)' }}>m</span>
        </div>

        {/* Ghost Lap Gap — only when ghost mode on */}
        <AnimatePresence>
          {ghostModeEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="flex flex-col items-end overflow-hidden"
            >
              <span className="bc-label" style={{ color: 'rgba(203,213,225,0.4)' }}>VS BEST LAP</span>
              <div className="-mt-0.5 flex items-baseline gap-0.5">
                <span ref={ghostGapRef} className="bc-value text-2xl" style={{ color: '#34d399' }}>+0.00</span>
                <span className="text-[10px]" style={{ color: 'rgba(203,213,225,0.2)' }}>s</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── LAP + SECTOR ── bottom-right corner, fixed so it never overlaps top-right ── */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
        className="absolute bottom-24 right-8 z-[60] text-right"
      >
        <span className="bc-label">LAP</span>
        <div className="bc-value text-4xl text-slate-200 -mt-1 tracking-tight">{currentLapNumber ?? '—'}</div>
        <div className="mt-1.5">
          <span className="bc-label">SECTOR</span>
          <div className="bc-value text-lg glow-red -mt-0.5">{currentSegmentId ?? '—'}</div>
        </div>
      </motion.div>



      {/* ── Telemetry HUD (speed, g-force, heading) ── */}
      <TelemetryHUD engine={engineRef.current} />

      {/* ── Split Timing HUD ── */}
      {telemetry && segments && laps && (
        <SplitTimingHUD engine={engineRef.current} />
      )}

      {/* ── Corner Intelligence HUD ── */}
      <CornerHUD analytics={cornerAnalytics} />

      {/* ── Cinematic Coaching Subtitles ── */}
      <CoachingSubtitles />

      {/* ── Theoretical Replay HUD ── */}
      <TheoreticalReplayHUD />

      {/* ── Micro Ghost Delta Meter ── */}
      <MicroGhostDeltaMeter engine={engineRef.current} />

      {/* ── Playback Controls ── */}
      <PlaybackControls />

      {/* ── Final Session Summary Overlay ── */}
      <AnimatePresence>
        {showSummary && (
          <FinalSessionSummary 
            data={summaryData} 
            onClose={() => useReplayStore.getState().toggleSummary()} 
          />
        )}
      </AnimatePresence>

      {/* ── Theoretical Lap Generation Overlay ── */}
      <AnimatePresence>
        {theoreticalOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="text-[10px] font-mono text-cyan-400 tracking-[0.5em] uppercase mb-4">
                Session_Processing
              </div>
              <h2 className="text-4xl font-black text-white tracking-tighter mb-8">
                GENERATING OPTIMAL LAP
              </h2>
              <div className="w-64 h-[1px] bg-white/10 mx-auto relative overflow-hidden">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="absolute inset-0 bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
                />
              </div>
              <div className="mt-8 text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                Stitching Best Sectors ... OK
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ReplayLayout = memo(ReplayLayoutComponent);
