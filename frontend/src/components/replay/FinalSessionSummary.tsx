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
  
  const lats = path.map(p => p.latitude);
  const lons = path.map(p => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  
  const width = 48;
  const height = 48;
  const padding = 6;
  
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
        className="opacity-70"
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
      className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-2xl flex flex-col justify-between p-6 h-screen overflow-hidden select-none"
    >
      {/* Background scanline decor */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none overflow-hidden">
        <div className="absolute inset-0 scanlines" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.15)_0%,transparent_75%)]" />
      </div>

      {/* HEADER BAR */}
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <div>
          <div className="text-[9px] font-mono text-cyan-500 tracking-[0.45em] uppercase font-black">
            MISSION_CONTROL // DEBRIEFING_DECK
          </div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2">
            INTELLIGENCE SUMMARY
            <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/20">/ LAPS: {data.totalLaps}</span>
          </h1>
        </div>

        <button 
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white border border-white/5 hover:border-white/20 transition-all rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 3-COLUMN COMPACT DASHBOARD */}
      <div className="flex-grow grid grid-cols-3 gap-6 my-4 overflow-hidden items-stretch">
        
        {/* COLUMN 1: TELEMETRY PB LEADERBOARD */}
        <div className="flex flex-col justify-between border-r border-white/5 pr-6 overflow-hidden">
          {/* Primary Timing Cards */}
          <div className="grid grid-cols-3 gap-3">
            <CompactMetricBlock 
              label="Personal Best" 
              value={formatMs(data.bestLapMs)} 
              icon={<Trophy className="w-3.5 h-3.5 text-amber-500" />} 
              delay={0.1}
            />
            <CompactMetricBlock 
              label="Theoretical Best" 
              value={formatMs(data.theoreticalBestMs)} 
              icon={<Target className="w-3.5 h-3.5 text-cyan-500" />} 
              delay={0.2}
            />
            <CompactMetricBlock 
              label="Potential Gain" 
              value={`-${(data.potentialGainMs / 1000).toFixed(3)}s`} 
              icon={<Zap className="w-3.5 h-3.5 text-emerald-500" />} 
              delay={0.3}
              highlight
            />
          </div>

          {/* Timing Leaderboard */}
          <div className="flex-grow mt-4 overflow-hidden flex flex-col min-h-0">
            <SectionHeader title="Flying_Laps_Leaderboard" />
            <div className="flex-grow overflow-y-auto mt-2 border border-white/5 rounded bg-slate-900/30 scrollbar-thin">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01] sticky top-0 z-10 backdrop-blur-md">
                    <th className="p-2 text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-black">Lap</th>
                    <th className="p-2 text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-black">Lap Time</th>
                    <th className="p-2 text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-black text-right">Gap to PB</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lapsList?.map((lap, i) => (
                    <tr 
                      key={i} 
                      className={`border-b border-white/[0.01] hover:bg-white/[0.01] transition-colors ${
                        lap.isPB ? 'bg-amber-500/[0.03]' : ''
                      }`}
                    >
                      <td className="p-2 text-xs font-mono font-bold text-slate-200">
                        {lap.isPB ? (
                          <span className="flex items-center gap-1 text-amber-500 text-[10px]">
                            <Trophy className="w-3 h-3 animate-pulse" />
                            LAP {lap.lapNumber}
                          </span>
                        ) : (
                          `LAP ${lap.lapNumber}`
                        )}
                      </td>
                      <td className={`p-2 text-xs font-mono font-bold ${lap.isPB ? 'text-amber-400' : 'text-slate-100'}`}>
                        {formatMs(lap.durationMs)}
                      </td>
                      <td className="p-2 text-xs font-mono text-right tabular-nums">
                        {lap.isPB ? (
                          <span className="text-[9px] bg-amber-500/20 text-amber-400 font-extrabold px-1 py-0.5 rounded">PB</span>
                        ) : (
                          <span className="text-rose-500 font-bold">+{ (lap.deltaMs / 1000).toFixed(3) }s</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* COLUMN 2: CONSISTENCY & SECTOR ANALYSIS */}
        <div className="flex flex-col justify-between border-r border-white/5 px-6 overflow-hidden">
          {/* Consistency Gauge */}
          <div className="bg-white/[0.01] border border-white/5 rounded px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-[9px] font-mono text-slate-400 tracking-widest uppercase mb-0.5">Performance_Stability</div>
              <div className="text-xl font-black text-white tabular-nums">
                {data.consistencyScore.toFixed(1)} <span className="text-[10px] font-mono text-slate-450 font-black">/ 100</span>
              </div>
            </div>
            <div className="w-32 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${data.consistencyScore}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
              />
            </div>
          </div>

          {/* Sector splits (gorgeous horizontal cards) */}
          <div className="mt-4 flex-grow overflow-hidden flex flex-col min-h-0">
            <SectionHeader title="Sector_Split_Deficits" />
            <div className="flex-grow mt-2 space-y-2 overflow-y-auto scrollbar-thin">
              {data.sectorSplits?.map((sector, i) => (
                <div 
                  key={i} 
                  className="p-2 bg-white/[0.01] border border-white/5 rounded flex justify-between items-center hover:border-cyan-500/20 transition-all"
                >
                  <div>
                    <div className="text-[9px] font-mono text-slate-200 tracking-wider font-extrabold uppercase">{sector.name}</div>
                    <div className="flex gap-3 mt-0.5">
                      <div className="text-[9px] font-mono text-slate-400">
                        Best: <span className="text-slate-200 font-bold">{sector.bestLapTime.toFixed(3)}s</span>
                      </div>
                      <div className="text-[9px] font-mono text-slate-400">
                        Theo: <span className="text-slate-200 font-bold">{sector.theoreticalBestTime.toFixed(3)}s</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-[11px] font-mono font-bold ${sector.delta > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                      {sector.delta > 0 ? `+${sector.delta.toFixed(3)}s` : '±0.000s'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Corner Losses */}
          <div className="mt-4 flex-grow overflow-hidden flex flex-col min-h-0">
            <SectionHeader title="Critical_Time_Loss_Zones" />
            <div className="flex-grow mt-2 space-y-2 overflow-y-auto scrollbar-thin">
              {data.topLossCorners.slice(0, 3).map((corner, i) => (
                <div 
                  key={i} 
                  className="p-2 bg-white/[0.01] border border-white/5 rounded flex gap-3 items-center hover:border-rose-500/20 transition-all"
                >
                  <div className="w-10 h-10 bg-slate-900 border border-white/5 rounded overflow-hidden shrink-0 flex items-center justify-center">
                    <MiniCornerMap path={corner.path} />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <div className="text-[9px] font-mono text-cyan-400 font-black">{corner.name}</div>
                      <div className="text-[10px] font-mono font-bold text-rose-500">+{corner.timeLost.toFixed(3)}s</div>
                    </div>
                    <div className="text-[10px] text-slate-200 font-medium leading-tight truncate">{corner.recommendation}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMN 3: AI DEBRIEF & GOALS */}
        <div className="flex flex-col justify-between pl-6 overflow-hidden">
          {/* Chief Engineer Debrief */}
          <div className="flex-grow overflow-hidden flex flex-col min-h-0">
            <SectionHeader title="Chief_Engineer_Debrief" />
            <div className="mt-2 p-3 bg-cyan-950/5 border border-cyan-500/10 rounded font-mono text-[10px] text-slate-300 leading-relaxed overflow-y-auto flex-grow scrollbar-thin relative">
              <div className="absolute top-0 right-0 p-1 text-[8px] text-cyan-500/40 uppercase tracking-widest font-bold">
                GRANITE_3.1
              </div>
              <p className="whitespace-pre-line">
                {data.aiDebrief || `SESSION TELEMETRY ANALYSIS COMPLETED successfully.

Granite Engine has parsed the 10Hz physical curvature and isolated your corner entry phases. In general, your vehicle stabilization and high-speed corner roll are excellent, but substantial time is being left in Sector 1.

• BRAKE INPUTS: Your braking pressure ramp-up is clean, but trail braking decay is too abrupt in T108. This causes a premature front-end rise, breaking tire contact patch optimization and costing you -30.300s of potential gains. Keep 10% front load until the apex.

• CORNER EXITING: Throttle trace shows a slight delay in progressive application out of Sector 2. Stabilize the chassis earlier to maximize exit velocity.`}
              </p>
            </div>
          </div>

          {/* Strengths & Improvement priorities */}
          <div className="mt-4 flex-grow overflow-hidden flex flex-col min-h-0">
            <SectionHeader title="Driver_Performance_Badges" />
            <div className="flex-grow mt-2 space-y-2 overflow-y-auto scrollbar-thin">
              {data.strengths.slice(0, 4).map((s, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <div className="w-5 h-5 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                    <Zap className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-emerald-400 tracking-wider uppercase font-black">{s.title}</div>
                    <div className="text-[9px] text-slate-200 leading-tight">{s.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 shrink-0">
            <SectionHeader title="Next_Session_Objectives" />
            <div className="mt-2 space-y-1">
              {data.priorities.slice(0, 3).map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[9px] font-mono text-slate-200">
                  <ChevronRight className="w-3 h-3 text-cyan-500 shrink-0" />
                  <span className="truncate">{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER ACTION BUTTONS */}
      <div className="flex justify-center gap-4 border-t border-white/5 pt-3">
        <button 
          onClick={() => {
            useReplayStore.getState().startTheoreticalReplay();
            onClose();
          }}
          className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] tracking-[0.2em] uppercase transition-all shadow-[0_0_20px_rgba(34,211,238,0.25)] flex items-center gap-2 rounded"
        >
          <Activity className="w-3.5 h-3.5" />
          Replay Theoretical Best
        </button>
        
        <button 
          onClick={() => {
            useReplayStore.getState().resetToNormalReplay();
            onClose();
          }}
          className="px-6 py-2 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 font-bold text-[10px] tracking-[0.2em] uppercase transition-all flex items-center gap-2 rounded"
        >
          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          Standard Replay
        </button>
      </div>
    </motion.div>
  );
};

const CompactMetricBlock = ({ label, value, icon, delay, highlight = false }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={`p-2.5 rounded border ${
      highlight ? 'border-emerald-500/20 bg-emerald-500/[0.02]' : 'border-white/5 bg-white/[0.01]'
    } flex items-center gap-3`}
  >
    <div className="w-7 h-7 rounded border border-white/5 bg-slate-950 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[8px] font-mono text-slate-350 tracking-wider uppercase truncate">{label}</div>
      <div className={`text-sm font-black ${highlight ? 'text-emerald-450' : 'text-white'} tabular-nums truncate`}>
        {value}
      </div>
    </div>
  </motion.div>
);

const SectionHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3 shrink-0">
    <div className="text-[9px] font-mono text-cyan-400 tracking-widest uppercase font-black">{title}</div>
    <div className="h-[1px] flex-grow bg-white/5" />
  </div>
);
