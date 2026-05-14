import React, { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
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
  const currentSegmentId = useReplayStore(state => state.currentSegmentId);

  // Find current segment details
  const activeSegment = useMemo(() => {
    if (!currentSegmentId) return null;
    return segments.find(s => s.segment_id === currentSegmentId) ?? null;
  }, [currentSegmentId, segments]);

  // Add segment data with gps_path for TrackMap
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
    <div className="w-full h-full flex flex-col relative scanline-overlay">
      {/* ── Header Bar ── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-30 flex items-center justify-between px-6 py-3 glass-panel border-b border-slate-800/50"
      >
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(34,211,238,0.05))',
            border: '1px solid rgba(34,211,238,0.3)',
          }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-slate-200" style={{ fontFamily: 'var(--font-sans)' }}>
              PIT<span className="text-cyan-400">WALL</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-light tracking-widest uppercase">Race Telemetry</p>
          </div>
        </div>

        {/* Session info */}
        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="label-micro">SESSION</span>
            <p className="label-data text-sm text-slate-300 mt-0.5">Donington Park GP</p>
          </div>
          <div>
            <span className="label-micro">DATE</span>
            <p className="label-data text-sm text-slate-400 mt-0.5">29 AUG 2019</p>
          </div>
          <div>
            <span className="label-micro">LAPS</span>
            <p className="label-data text-sm text-cyan-400 mt-0.5">{laps.length}</p>
          </div>
        </div>
      </motion.header>

      {/* ── Main Canvas: Track Map (fills remaining space) ── */}
      <div className="flex-1 relative z-10">
        <TrackMap
          telemetry={telemetry}
          segments={segmentsWithPath as any}
          engine={engineRef.current}
        />

        {/* ── Floating HUD (absolute over the map) ── */}
        <div className="absolute top-4 left-4 right-4 z-30 flex justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <TelemetryHUD engine={engineRef.current} />
          </div>
        </div>

        {/* ── Corner Event Toast ── */}
        {activeSegment && activeSegment.segment_type === 'corner' && (
          <motion.div
            key={activeSegment.segment_id}
            initial={{ opacity: 0, x: 30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-4 right-4 z-30 glass-panel-bright rounded-xl px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 rounded-full bg-red-500 shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
              <div>
                <p className="label-micro text-red-400">{activeSegment.segment_id}</p>
                <p className="text-sm font-semibold text-slate-200 mt-0.5">{activeSegment.classification}</p>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  {Math.abs(activeSegment.heading_change_degrees).toFixed(0)}° · {activeSegment.average_speed.toFixed(0)} km/h
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Bottom Playback Bar ── */}
      <div className="relative z-30 px-6 pb-4 pt-2">
        <PlaybackControls />
      </div>
    </div>
  );
};
