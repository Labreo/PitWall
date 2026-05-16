import React from 'react';
import { motion } from 'framer-motion';

interface TrackRebuildAnimationProps {
  stage: number;
}

export const TrackRebuildAnimation: React.FC<TrackRebuildAnimationProps> = ({ stage }) => {
  // A stylized, generic F1-style circuit wireframe for reconstruction
  const pathD = "M 50,150 C 70,50 150,30 250,50 C 350,70 450,150 400,250 C 350,350 250,370 150,350 C 50,330 30,250 50,150";

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] z-10 pointer-events-none">
      <svg viewBox="0 0 500 400" className="w-full h-full overflow-visible">
        {/* Shadow Track */}
        <path 
          d={pathD} 
          fill="none" 
          stroke="rgba(34,211,238,0.05)" 
          strokeWidth="4"
        />

        {/* Reconstructing Track */}
        <motion.path
          d={pathD}
          fill="none"
          stroke="rgba(34,211,238,0.4)"
          strokeWidth="2"
          strokeDasharray="1000"
          initial={{ strokeDashoffset: 1000 }}
          animate={{ strokeDashoffset: Math.max(0, 1000 - (stage * 120)) }}
          transition={{ duration: 2, ease: "easeInOut" }}
          filter="drop-shadow(0 0 12px rgba(34,211,238,0.5))"
        />

        {/* Pulse Point (Leading edge) */}
        {stage > 0 && stage < 9 && (
          <motion.circle
            r="4"
            fill="#22d3ee"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{
              offsetPath: `path("${pathD}")`,
              offsetDistance: `${(stage / 9) * 100}%`
            }}
          />
        )}

        {/* Corner Node Reveal */}
        {stage >= 4 && [10, 35, 60, 85].map((dist, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.2 }}
            style={{
              offsetPath: `path("${pathD}")`,
              offsetDistance: `${dist}%`
            }}
          >
            <circle r="3" fill="rgba(248,113,113,0.6)" />
            <text 
              y="-10" 
              textAnchor="middle" 
              className="text-[8px] font-mono fill-rose-400/60 font-bold"
            >
              SEG_{i+1}
            </text>
          </motion.g>
        ))}
      </svg>
      
      {/* HUD Label */}
      <div className="absolute top-0 right-0 p-4 border-r border-t border-cyan-500/20">
        <div className="text-[10px] font-mono text-cyan-400/40 tracking-widest uppercase">
          Reconstruction_Matrix_v4
        </div>
        <div className="text-2xl font-black text-cyan-500/80 tracking-tighter tabular-nums">
          {Math.min(99.9, (stage / 9) * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
};
