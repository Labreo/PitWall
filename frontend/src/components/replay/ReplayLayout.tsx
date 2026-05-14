import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrackMap } from '../map/TrackMap';
import { TelemetryHUD } from './TelemetryHUD';
import { PlaybackControls } from './PlaybackControls';
import { useReplayEngine } from '../../hooks/useReplayEngine';
import { useReplayStore } from '../../store/replayStore';
import { MOCK_TELEMETRY, MOCK_SEGMENTS, MOCK_LAPS } from '../../utils/mockData';
import { TelemetryPoint, Segment, Lap } from '../../types/telemetry';

interface ReplayLayoutProps {
  telemetry?: TelemetryPoint[];
  segments?: Segment[];
  laps?: Lap[];
}

export const ReplayLayout: React.FC<ReplayLayoutProps> = ({
  telemetry = MOCK_TELEMETRY,
  segments = MOCK_SEGMENTS,
  laps = MOCK_LAPS,
}) => {
  const engineRef = useReplayEngine(telemetry, segments, laps);
  const currentSegmentId = useReplayStore(s => s.currentSegmentId);

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
      {/* ── Fullscreen Track Map (THE canvas) ── */}
      <TrackMap
        telemetry={telemetry}
        segments={segmentsWithPath as any}
        engine={engineRef.current}
      />

      {/* ── Atmospheric layers ── */}
      <div className="absolute inset-0 pointer-events-none vignette z-[45]" />
      <div className="absolute inset-0 pointer-events-none edge-fade-bottom z-[45]" />
      <div className="absolute inset-0 pointer-events-none edge-fade-top z-[45]" />

      {/* ── PITWALL watermark: top-left corner ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.1 }}
        className="absolute top-5 left-6 z-[60] flex items-center gap-2"
      >
        <div className="w-[3px] h-5 rounded-full" style={{ background: 'rgba(34,211,238,0.5)', boxShadow: '0 0 8px rgba(34,211,238,0.3)' }} />
        <div>
          <div className="text-[11px] font-bold tracking-[0.15em]" style={{ color: 'rgba(226,232,240,0.7)' }}>
            PIT<span style={{ color: 'rgba(34,211,238,0.8)' }}>WALL</span>
          </div>
          <div className="text-[7px] font-medium tracking-[0.25em] uppercase" style={{ color: 'rgba(148,163,184,0.3)' }}>
            TELEMETRY REPLAY
          </div>
        </div>
      </motion.div>

      {/* ── Session badge: top-center ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
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

      {/* ── Telemetry HUD overlays ── */}
      <TelemetryHUD engine={engineRef.current} />

      {/* ── Corner Event: broadcast-style popup ── */}
      <AnimatePresence>
        {activeSegment && activeSegment.segment_type === 'corner' && (
          <motion.div
            key={activeSegment.segment_id}
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-16 right-8 z-[60]"
          >
            <div className="flex items-center gap-3">
              {/* Accent bar */}
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

      {/* ── Playback Controls: bottom edge ── */}
      <PlaybackControls />
    </div>
  );
};
