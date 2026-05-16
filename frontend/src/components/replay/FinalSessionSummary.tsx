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
      className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-12 overflow-hidden"
    >
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden">
        <div className="absolute inset-0 scanlines" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.2)_0%,transparent_70%)]" />
      </div>

      <button 
        onClick={onClose}
        className="absolute top-10 right-10 p-2 text-slate-500 hover:text-white transition-colors z-[110]"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="max-w-6xl w-full grid grid-cols-12 gap-12 relative z-[110]">
        
        {/* LEFT COLUMN: PRIMARY METRICS */}
        <div className="col-span-4 space-y-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-[10px] font-mono text-cyan-500 tracking-[0.4em] uppercase mb-1">
              Session_Complete
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">
              Intelligence<br/>Summary
            </h1>
          </motion.div>

          <div className="space-y-6">
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
            className="pt-6 border-t border-white/5"
          >
            <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase mb-4">
              Performance_Stability
            </div>
            <div className="flex items-end gap-3">
              <div className="text-4xl font-black text-white tabular-nums">
                {data.consistencyScore.toFixed(1)}
              </div>
              <div className="text-[10px] font-mono text-slate-600 mb-2 uppercase">/ 100</div>
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
        </div>

        {/* RIGHT COLUMN: INSIGHTS & COACHING */}
        <div className="col-span-8 grid grid-cols-2 gap-12">
          
          {/* Top Loss Corners */}
          <div className="space-y-8">
            <SectionHeader title="Critical_Time_Loss" />
            <div className="space-y-4">
              {data.topLossCorners.map((corner, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + (i * 0.1) }}
                  className="p-4 bg-white/[0.02] border border-white/5 rounded-sm flex gap-4 items-center group hover:border-cyan-500/30 transition-colors"
                >
                  {/* Mini Map Visual */}
                  <div className="w-16 h-16 bg-slate-900/50 rounded-sm overflow-hidden shrink-0 border border-white/5">
                    <MiniCornerMap path={corner.path} />
                  </div>

                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-1">
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
          <div className="space-y-8">
            <div className="space-y-6">
              <SectionHeader title="Driver_Strengths" />
              <div className="space-y-4">
                {data.strengths.map((s, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.3 + (i * 0.1) }}
                    className="flex gap-4"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-white tracking-widest uppercase mb-0.5">{s.title}</div>
                      <div className="text-[10px] text-slate-500 leading-tight">{s.description}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-white/5">
              <SectionHeader title="Improvement_Directives" />
              <div className="space-y-3">
                {data.priorities.map((p, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.6 + (i * 0.1) }}
                    className="flex items-center gap-3 text-[10px] font-mono text-slate-400"
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2 }}
        className="mt-20 flex flex-col items-center gap-6"
      >
        <div className="flex gap-6">
          <button 
            onClick={() => {
              useReplayStore.getState().startTheoreticalReplay();
              onClose();
            }}
            className="px-10 py-3 bg-cyan-600 text-white font-bold text-xs tracking-[0.2em] uppercase hover:bg-cyan-500 transition-all shadow-[0_0_30px_rgba(34,211,238,0.2)] flex items-center gap-3"
          >
            <Activity className="w-4 h-4" />
            Replay Theoretical Best
          </button>
          
          <button 
            onClick={() => {
              useReplayStore.getState().resetToNormalReplay();
              onClose();
            }}
            className="px-10 py-3 border border-cyan-500/30 text-cyan-400 font-bold text-xs tracking-[0.2em] uppercase hover:bg-cyan-500/10 transition-all flex items-center gap-3"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Standard Replay
          </button>
        </div>

        <div className="flex gap-6 opacity-40">
          <button 
            onClick={() => window.location.hash = 'upload'}
            className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase hover:text-white transition-all"
          >
            Archive Session & Exit
          </button>
        </div>
      </motion.div>
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
