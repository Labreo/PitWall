import React, { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReplayStore } from '../../store/replayStore';
import { CoachingSeverity, CoachingCategory } from '../../types/coaching';

const SEVERITY_COLOR: Record<CoachingSeverity, string> = {
  info: '#22d3ee',
  warn: '#fbbf24',
  critical: '#f87171',
};

const CATEGORY_LABEL: Record<CoachingCategory, string> = {
  braking: 'BRAKING',
  apex: 'APEX',
  throttle: 'THROTTLE',
  consistency: 'CONSISTENCY',
  racing_line: 'LINE',
};

const WAVE_HEIGHTS = Array.from({ length: 12 }, (_, i) =>
  0.3 + 0.7 * Math.abs(Math.sin((i / 12) * Math.PI * 2.1))
);

const CoachingOverlayComponent: React.FC = () => {
  const event = useReplayStore(s => s.activeCoachingEvent);
  const isSpeechActive = useReplayStore(s => s.isSpeechActive);

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="absolute z-[75] pointer-events-none coaching-panel"
          style={{ top: '50%', left: 28, transform: 'translateY(-50%)', width: 260 }}
        >
          {/* Left accent bar — intensifies during speech */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full"
            style={{
              background: `linear-gradient(to bottom, ${SEVERITY_COLOR[event.severity]}, transparent)`,
              boxShadow: isSpeechActive
                ? `0 0 20px ${SEVERITY_COLOR[event.severity]}A0, 0 0 40px ${SEVERITY_COLOR[event.severity]}30`
                : `0 0 8px ${SEVERITY_COLOR[event.severity]}40`,
              transition: 'box-shadow 200ms ease',
            }}
          />

          <div
            className="ml-3 rounded-sm overflow-hidden"
            style={{
              background: 'rgba(2,4,8,0.88)',
              border: `1px solid ${SEVERITY_COLOR[event.severity]}${isSpeechActive ? '40' : '20'}`,
              backdropFilter: 'blur(8px)',
              transition: 'border-color 200ms ease',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ borderBottom: `1px solid ${SEVERITY_COLOR[event.severity]}18` }}
            >
              <div className="flex items-center gap-2">
                {/* Radio TX bars during speech, pulsing dot when idle */}
                {isSpeechActive ? (
                  <div className="flex items-end gap-[2px] h-3">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="radio-tx-bar w-[2px] rounded-full"
                        style={{
                          background: SEVERITY_COLOR[event.severity],
                          animationDelay: `${i * 0.13}s`,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: SEVERITY_COLOR[event.severity],
                      boxShadow: `0 0 6px ${SEVERITY_COLOR[event.severity]}`,
                      animation: 'pulse-dot 1.4s ease-in-out infinite',
                    }}
                  />
                )}
                <span
                  className="text-[8px] font-bold tracking-[0.2em] uppercase"
                  style={{ color: 'rgba(226,232,240,0.55)' }}
                >
                  ENGINEER BRIEFING
                </span>
              </div>
              <span
                className="text-[7px] font-mono font-semibold tracking-wider px-1.5 py-0.5 rounded-sm"
                style={{
                  color: SEVERITY_COLOR[event.severity],
                  background: `${SEVERITY_COLOR[event.severity]}15`,
                  border: `1px solid ${SEVERITY_COLOR[event.severity]}30`,
                }}
              >
                {CATEGORY_LABEL[event.category]}
              </span>
            </div>

            {/* Message */}
            <div className="px-3 py-2.5">
              <p
                className="text-[11px] font-medium leading-[1.55]"
                style={{ color: 'rgba(226,232,240,0.85)' }}
              >
                {event.message}
              </p>
            </div>

            {/* Stats row + waveform */}
            <div
              className="px-3 pb-2.5 flex items-end justify-between"
              style={{ borderTop: `1px solid rgba(148,163,184,0.06)`, paddingTop: 8 }}
            >
              {/* Delta time */}
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[8px] font-mono"
                  style={{ color: 'rgba(148,163,184,0.35)' }}
                >
                  Δ
                </span>
                <span
                  className="text-[11px] font-mono font-semibold"
                  style={{ color: event.delta_time_loss > 0 ? SEVERITY_COLOR[event.severity] : 'rgba(34,211,238,0.7)' }}
                >
                  {event.delta_time_loss > 0 ? '+' : ''}{event.delta_time_loss.toFixed(2)}s
                </span>
                {event.corner_id && (
                  <span
                    className="text-[8px] font-mono ml-1"
                    style={{ color: 'rgba(148,163,184,0.3)' }}
                  >
                    {event.corner_id}
                  </span>
                )}
              </div>

              {/* Waveform bars — speed up during speech */}
              <div className="flex items-end gap-[2px]" style={{ height: 18 }}>
                {WAVE_HEIGHTS.map((h, i) => (
                  <div
                    key={i}
                    className={`coaching-bar w-[2px] rounded-full${isSpeechActive ? ' coaching-bar--active' : ''}`}
                    style={{
                      height: `${Math.round(h * 18)}px`,
                      background: SEVERITY_COLOR[event.severity],
                      opacity: 0.55 + h * 0.4,
                      animationDelay: `${i * 0.05}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const CoachingOverlay = memo(CoachingOverlayComponent);
