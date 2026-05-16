import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STAGES = [
  "EXTRACTING_GOPRO_METADATA",
  "NORMALIZING_DATA_STREAM",
  "DETECTING_LAP_BOUNDARIES",
  "SEGMENTING_TRACK_GEOMETRY",
  "BUILDING_RACING_INTELLIGENCE",
  "RETRIEVING_KNOWLEDGE_BASE",
  "GENERATING_AI_COACHING",
  "SYNCHRONIZING_REPLAY_ENGINE",
  "LAUNCHING_SYSTEM_OVERLAY"
];

interface IntelligenceStageAnimatorProps {
  currentStage: number;
  overallStatus: string;
}

export const IntelligenceStageAnimator: React.FC<IntelligenceStageAnimatorProps> = ({ currentStage, overallStatus }) => {
  return (
    <div className="absolute top-1/4 left-10 z-30 flex flex-col gap-6">
      {STAGES.map((label, idx) => {
        const isComplete = idx < currentStage || (idx === currentStage && overallStatus === 'completed');
        const isActive = idx === currentStage && overallStatus !== 'completed' && overallStatus !== 'failed';
        
        return (
          <div key={idx} className="flex items-center gap-4 group">
            {/* Status Indicator */}
            <div className="relative w-3 h-3 flex items-center justify-center">
              {isComplete ? (
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }}
                  className="w-full h-full bg-cyan-400 rounded-sm shadow-[0_0_8px_rgba(34,211,238,0.5)]" 
                />
              ) : isActive ? (
                <motion.div 
                  animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.4, 1, 0.4] 
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-full h-full border border-cyan-400 rounded-sm"
                />
              ) : (
                <div className="w-full h-full border border-slate-700 rounded-sm" />
              )}
              
              {isActive && (
                <motion.div 
                  layoutId="active-glow"
                  className="absolute inset-0 bg-cyan-400/20 blur-md rounded-full"
                />
              )}
            </div>

            {/* Label */}
            <div className="flex flex-col">
              <span className={`text-[10px] font-mono tracking-[0.25em] transition-all duration-500 ${
                isActive ? 'text-white font-bold' : isComplete ? 'text-cyan-500/40' : 'text-slate-700'
              }`}>
                {label}
              </span>
              
              <AnimatePresence>
                {isActive && (
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    className="h-[1px] bg-cyan-500/50 mt-1"
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
};
