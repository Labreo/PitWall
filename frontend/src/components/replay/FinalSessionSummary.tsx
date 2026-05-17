import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SessionSummaryData } from '../../types/summary';
import { useReplayStore } from '../../store/replayStore';
import { Trophy, Target, Zap, Activity, ChevronRight, X } from 'lucide-react';

interface FinalSessionSummaryProps {
  data: SessionSummaryData;
  onClose: () => void;
}

const MiniCornerMap = ({ path }: { path: { latitude: number, longitude: number }[] }) => {
  if (path.length < 2) return null;
  
  // Simple bounding box projection
  const lats = path.map(p => p.latitude);
  const lons = path.map(p => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  
  const width = 64;
  const height = 64;
  const padding = 10;
  
  const scaleX = (lon: number) => padding + ((lon - minLon) / (maxLon - minLon)) * (width - 2 * padding);
  const scaleY = (lat: number) => padding + (1 - (lat - minLat) / (maxLat - minLat)) * (height - 2 * padding);
  
  const points = path.map(p => `${scaleX(p.longitude)},${scaleY(p.latitude)}`).join(' ');
  
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke="#22d3ee"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-60"
        style={{ filter: 'drop-shadow(0 0 2px rgba(34,211,238,0.5))' }}
      />
    </svg>
  );
};

export const FinalSessionSummary: React.FC<FinalSessionSummaryProps> = ({ data, onClose }) => {
  const formatMs = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = ((ms % 60000) / 1000).toFixed(3);
    return `${min}:${sec.padStart(6, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center p-6 md:p-8 overflow-y-auto"
    >
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden">
        <div className="absolute inset-0 scanlines" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.2)_0%,transparent_70%)]" />
      </div>

      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors z-[110]"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="max-w-6xl w-full flex flex-col justify-between my-auto gap-8 relative z-[110]">
        <div className="grid grid-cols-12 gap-8 w-full">
          
          {/* LEFT COLUMN: PRIMARY METRICS */}
          <div className="col-span-4 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-[10px] font-mono text-cyan-500 tracking-[0.4em] uppercase mb-1">
                Session_Complete
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
                Intelligence<br/>Summary
              </h1>
            </motion.div>

            <div className="space-y-4">
              <MetricBlock 
                label="Personal Best" 
                value={formatMs(data.bestLapMs)} 
                icon={<Trophy className="w-4 h-4 text-amber-500" />} 
                delay={0.4}
              />
              <MetricBlock 
                label="Theoretical Best" 
                value={formatMs(data.theoreticalBestMs)} 
                icon={<Target className="w-4 h-4 text-cyan-500" />} 
                delay={0.5}
              />
              <MetricBlock 
                label="Potential Gain" 
                value={`-${(data.potentialGainMs / 1000).toFixed(3)}s`} 
                icon={<Zap className="w-4 h-4 text-emerald-500" />} 
                delay={0.6}
                highlight
              />
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="pt-4 border-t border-white/5"
            >
              <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase mb-2">
                Performance_Stability
              </div>
              <div className="flex items-end gap-3">
                <div className="text-3xl font-black text-white tabular-nums">
                  {data.consistencyScore.toFixed(1)}
                </div>
                <div className="text-[10px] font-mono text-slate-600 mb-1.5 uppercase">/ 100</div>
              </div>
              <div className="w-full h-1 bg-slate-900 rounded-full mt-2 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${data.consistencyScore}%` }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 1 }}
                  className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                />
              </div>
            </motion.div>

            {/* AI Race Engineer Debrief */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="pt-4 border-t border-white/5 space-y-2"
            >
              <div className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Chief_Engineer_Debrief
              </div>
              <div className="p-3 bg-cyan-950/5 border border-cyan-500/10 rounded-sm font-mono text-[11px] text-slate-300 leading-relaxed relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1.5 text-[9px] text-cyan-500/30 uppercase tracking-widest">
                  GRANITE_3.1_AI
                </div>
                <p>
                  {data.aiDebrief || "Session complete. Telemetry analysis indicates solid execution in low-speed sections. Key time loss is concentrated in late braking stability and trail braking maintenance. Focus on smoother transitions into high-speed apex entry zones."}
                </p>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: INSIGHTS & COACHING */}
          <div className="col-span-8 grid grid-cols-2 gap-8">
          
          {/* Top Loss Corners */}
          <div className="space-y-5">
            <SectionHeader title="Critical_Time_Loss" />
            <div className="space-y-2">
              {data.topLossCorners.map((corner, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + (i * 0.1) }}
                  className="p-2.5 bg-white/[0.01] border border-white/5 rounded-sm flex gap-3 items-center group hover:border-cyan-500/20 transition-colors"
                >
                  {/* Mini Map Visual */}
                  <div className="w-12 h-12 bg-slate-900/50 rounded-sm overflow-hidden shrink-0 border border-white/5 flex items-center justify-center">
                    <MiniCornerMap path={corner.path} />
                  </div>

                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-0.5">
                      <div className="text-[10px] font-mono text-cyan-500">{corner.name}</div>
                      <div className="text-xs font-bold text-rose-500 tabular-nums">+{corner.timeLost.toFixed(3)}s</div>
                    </div>
                    <div className="text-[11px] text-slate-300 font-medium leading-tight">{corner.recommendation}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Strengths & Priorities */}
          <div className="space-y-5">
            <div className="space-y-4">
              <SectionHeader title="Driver_Strengths" />
              <div className="space-y-3">
                {data.strengths.map((s, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.3 + (i * 0.1) }}
                    className="flex gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-white tracking-widest uppercase mb-0.5">{s.title}</div>
                      <div className="text-[10px] text-slate-500 leading-tight">{s.description}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <SectionHeader title="Improvement_Directives" />
              <div className="space-y-2">
                {data.priorities.map((p, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.6 + (i * 0.1) }}
                    className="flex items-center gap-2 text-[10px] font-mono text-slate-400"
                  >
                    <ChevronRight className="w-3 h-3 text-cyan-500" />
                    {p}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2 }}
          className="mt-6 flex flex-col items-center gap-4"
        >
          <div className="flex gap-4">
            <button 
              onClick={() => {
                useReplayStore.getState().startTheoreticalReplay();
                onClose();
              }}
              className="px-8 py-2.5 bg-cyan-600 text-white font-bold text-xs tracking-[0.2em] uppercase hover:bg-cyan-500 transition-all shadow-[0_0_30px_rgba(34,211,238,0.2)] flex items-center gap-3 rounded-sm"
            >
              <Activity className="w-4 h-4" />
              Replay Theoretical Best
            </button>
            
            <button 
              onClick={() => {
                useReplayStore.getState().resetToNormalReplay();
                onClose();
              }}
              className="px-8 py-2.5 border border-cyan-500/30 text-cyan-400 font-bold text-xs tracking-[0.2em] uppercase hover:bg-cyan-500/10 transition-all flex items-center gap-3 rounded-sm"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Standard Replay
            </button>
          </div>

          <div className="flex gap-4 opacity-40">
            <button 
              onClick={() => window.location.hash = 'upload'}
              className="text-[9px] text-slate-500 font-bold tracking-[0.2em] uppercase hover:text-white transition-all"
            >
              Archive Session & Exit
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

const MetricBlock = ({ label, value, icon, delay, highlight = false }: any) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    className="flex items-center gap-4 group"
  >
    <div className={`w-10 h-10 rounded-sm border ${highlight ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-white/[0.02]'} flex items-center justify-center transition-all group-hover:scale-110`}>
      {icon}
    </div>
    <div>
      <div className="text-[9px] font-mono text-slate-500 tracking-widest uppercase mb-0.5">{label}</div>
      <div className={`text-2xl font-black ${highlight ? 'text-emerald-400' : 'text-white'} tabular-nums tracking-tighter`}>
        {value}
      </div>
    </div>
  </motion.div>
);

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-4">
    <div className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase">{title}</div>
    <div className="h-[1px] flex-grow bg-white/5" />
  </div>
);
