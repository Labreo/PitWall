import { useEffect, useRef, MutableRefObject } from 'react';
import { useReplayStore } from '../../store/replayStore';
import { CornerAnalytics } from '../map/CornerIntelligenceLayer';

interface CornerHUDProps {
  analytics: CornerAnalytics[];
}

export function CornerHUD({ analytics }: CornerHUDProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = useReplayStore.subscribe((state) => {
      const newId = state.currentSegmentId;
      if (newId === activeIdRef.current) return;

      const ca = newId ? analytics.find(a => a.segment.segment_id === newId) ?? null : null;

      if (ca) {
        showHUD(rootRef.current, ca, rafRef);
      } else {
        hideHUD(rootRef.current, rafRef);
      }

      activeIdRef.current = newId;
    });
    return () => { unsub(); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [analytics]);

  return (
    <div
      ref={rootRef}
      className="corner-hud"
      style={{
        position: 'absolute',
        bottom: 90,
        right: 28,
        width: 200,
        opacity: 0,
        transform: 'translateX(12px)',
        pointerEvents: 'none',
        zIndex: 60,
        willChange: 'opacity, transform',
      }}
    >
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div
          className="corner-hud-accent"
          style={{
            width: 3,
            height: 32,
            borderRadius: 2,
            background: 'linear-gradient(to bottom, #f87171, rgba(248,113,113,0.15))',
            boxShadow: '0 0 10px rgba(248,113,113,0.35)',
            flexShrink: 0,
          }}
        />
        <div>
          <div
            className="corner-hud-id"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(248,113,113,0.7)',
            }}
          >
            CORNER
          </div>
          <div
            className="corner-hud-classification"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(226,232,240,0.85)',
              lineHeight: 1.2,
              marginTop: 1,
            }}
          >
            —
          </div>
        </div>
      </div>

      {/* Speed strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 1,
          marginBottom: 6,
        }}
      >
        {[
          { cls: 'hud-entry-speed', label: 'ENTRY', color: 'rgba(251,191,36,0.8)' },
          { cls: 'hud-min-speed', label: 'APEX', color: 'rgba(52,211,153,0.8)' },
          { cls: 'hud-exit-speed', label: 'EXIT', color: 'rgba(34,211,238,0.8)' },
        ].map(({ cls, label, color }) => (
          <div
            key={label}
            style={{
              background: 'rgba(2,4,8,0.6)',
              border: '1px solid rgba(148,163,184,0.06)',
              borderRadius: 3,
              padding: '5px 4px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 7,
                fontWeight: 600,
                letterSpacing: '0.15em',
                color: 'rgba(148,163,184,0.4)',
                marginBottom: 2,
              }}
            >
              {label}
            </div>
            <div
              className={cls}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                fontWeight: 700,
                color,
                lineHeight: 1,
                letterSpacing: '-0.03em',
              }}
            >
              —
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 7,
                color: 'rgba(148,163,184,0.3)',
                marginTop: 1,
              }}
            >
              km/h
            </div>
          </div>
        ))}
      </div>

      {/* Time delta row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '5px 8px',
          background: 'rgba(2,4,8,0.5)',
          border: '1px solid rgba(148,163,184,0.06)',
          borderRadius: 3,
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 7,
            fontWeight: 600,
            letterSpacing: '0.15em',
            color: 'rgba(148,163,184,0.35)',
          }}
        >
          TIME ΔLOSS
        </span>
        <span
          className="hud-time-delta"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'rgba(248,113,113,0.7)',
          }}
        >
          —
        </span>
      </div>

      {/* Heading stat */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 4,
          padding: '4px 8px',
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 7,
            fontWeight: 600,
            letterSpacing: '0.15em',
            color: 'rgba(148,163,184,0.25)',
          }}
        >
          HEADING Δ
        </span>
        <span
          className="hud-heading"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            color: 'rgba(148,163,184,0.4)',
            letterSpacing: '-0.02em',
          }}
        >
          —
        </span>
      </div>
    </div>
  );
}

function showHUD(
  root: HTMLDivElement | null,
  ca: CornerAnalytics,
  rafRef: MutableRefObject<number | null>
) {
  if (!root) return;

  // Populate values
  const id = root.querySelector('.corner-hud-id') as HTMLElement | null;
  const cls = root.querySelector('.corner-hud-classification') as HTMLElement | null;
  const entry = root.querySelector('.hud-entry-speed') as HTMLElement | null;
  const apex = root.querySelector('.hud-min-speed') as HTMLElement | null;
  const exit = root.querySelector('.hud-exit-speed') as HTMLElement | null;
  const delta = root.querySelector('.hud-time-delta') as HTMLElement | null;
  const heading = root.querySelector('.hud-heading') as HTMLElement | null;

  if (id) id.textContent = ca.segment.segment_id;
  if (cls) cls.textContent = ca.segment.classification;
  if (entry) entry.textContent = Math.round(ca.entrySpeed).toString();
  if (apex) apex.textContent = Math.round(ca.minSpeed).toString();
  if (exit) exit.textContent = Math.round(ca.exitSpeed).toString();

  const deltaSign = ca.timeDelta >= 0 ? '+' : '';
  if (delta) {
    delta.textContent = `${deltaSign}${ca.timeDelta.toFixed(2)}s`;
    (delta as HTMLElement).style.color = ca.timeDelta > 0
      ? 'rgba(248,113,113,0.8)'
      : 'rgba(52,211,153,0.8)';
  }
  if (heading) {
    heading.textContent = `${Math.abs(ca.segment.heading_change_degrees).toFixed(0)}°`;
  }

  // Animate in
  if (rafRef.current) cancelAnimationFrame(rafRef.current);
  const start = performance.now();
  const duration = 280;

  function tick(now: number) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    root!.style.opacity = ease.toString();
    root!.style.transform = `translateX(${(1 - ease) * 12}px)`;
    if (t < 1) rafRef.current = requestAnimationFrame(tick);
  }
  rafRef.current = requestAnimationFrame(tick);
}

function hideHUD(
  root: HTMLDivElement | null,
  rafRef: MutableRefObject<number | null>
) {
  if (!root) return;
  const startOpacity = parseFloat(root.style.opacity ?? '0');
  if (startOpacity === 0) return;

  if (rafRef.current) cancelAnimationFrame(rafRef.current);
  const start = performance.now();
  const duration = 220;

  function tick(now: number) {
    const t = Math.min((now - start) / duration, 1);
    const ease = t * t;
    root!.style.opacity = (startOpacity * (1 - ease)).toString();
    root!.style.transform = `translateX(${ease * 10}px)`;
    if (t < 1) rafRef.current = requestAnimationFrame(tick);
  }
  rafRef.current = requestAnimationFrame(tick);
}
