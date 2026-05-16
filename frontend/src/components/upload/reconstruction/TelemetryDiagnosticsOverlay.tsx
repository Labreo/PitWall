import React from 'react';
import { motion } from 'framer-motion';

export const TelemetryDiagnosticsOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 z-20 pointer-events-none p-10 flex flex-col justify-between">
      {/* Top Left: System Metadata */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <div className="text-[10px] font-mono text-emerald-400 tracking-[0.2em] font-bold uppercase">
            Data_Stream_Stable
          </div>
        </div>
        <div className="text-[8px] font-mono text-slate-500/60 leading-tight">
          PID: 57449 // KERNEL: MOTORSPORT_V2<br/>
          BUFFER: 1024MB // OVERWRITE: FALSE<br/>
          SYNC: REPLAY_MASTER
        </div>
      </div>

      {/* Top Right: Signal Strength / GPS Lock */}
      <div className="self-end flex flex-col items-end gap-1">
        <div className="flex gap-0.5">
          {[0.4, 0.6, 0.8, 1, 0.7].map((h, i) => (
            <motion.div 
              key={i}
              animate={{ height: [h*10, h*20, h*10] }}
              transition={{ duration: 0.5 + (i*0.1), repeat: Infinity }}
              className="w-1 bg-cyan-500/40 rounded-full"
            />
          ))}
        </div>
        <div className="text-[8px] font-mono text-cyan-400/50 uppercase tracking-widest">
          GPS_Sat_Link: Locked (12)
        </div>
      </div>

      {/* Bottom Center: IMU Calibration Visual */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
        <div className="relative w-24 h-24 border border-cyan-500/10 rounded-full flex items-center justify-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-t border-cyan-400/30 rounded-full"
          />
          <div className="w-px h-12 bg-cyan-400/20" />
          <div className="w-12 h-px bg-cyan-400/20 absolute" />
          
          <motion.div 
            animate={{ 
              x: [-2, 2, -1, 1, 0],
              y: [-1, 1, 2, -2, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-2 h-2 bg-rose-500/60 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.8)]" 
          />
          <div className="absolute -bottom-6 text-[8px] font-mono text-slate-500 tracking-tighter uppercase whitespace-nowrap">
            IMU_Vector_Stability: 0.994
          </div>
        </div>
      </div>

      {/* Bottom Left: Hex Stream */}
      <div className="text-[7px] font-mono text-cyan-500/30 max-w-[200px] leading-none overflow-hidden h-24">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="whitespace-nowrap">
            {Math.random().toString(16).toUpperCase()} {Math.random().toString(16).toUpperCase()}
          </div>
        ))}
      </div>

      {/* Bottom Right: Corner ID Log */}
      <div className="self-end text-right border-r-2 border-cyan-500/40 pr-3">
        <div className="text-[10px] font-mono text-cyan-400 tracking-widest font-bold">
          DIAG_SEQ_ACTIVE
        </div>
        <div className="text-[8px] font-mono text-slate-500/60 uppercase">
          Reconstructing_Splines...
        </div>
      </div>
    </div>
  );
};
