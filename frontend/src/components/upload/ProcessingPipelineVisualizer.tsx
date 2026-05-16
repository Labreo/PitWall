import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Stage {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  duration_ms?: number;
}

interface Props {
  stages: Stage[];
  currentIdx: number;
}

const ProcessingPipelineVisualizer: React.FC<Props> = ({ stages, currentIdx }) => {
  return (
    <div className="w-full max-w-3xl space-y-12 py-12">
      {/* Top Diagnostic Radar */}
      <div className="flex justify-center">
        <div className="relative w-32 h-32">
          <motion.div 
            className="absolute inset-0 border-2 border-cyan-500/20 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div 
            className="absolute inset-4 border border-cyan-500/40 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-cyan-500" />
          </motion.div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-mono text-cyan-500 uppercase tracking-tighter animate-pulse">
              System<br/>Init
            </span>
          </div>
        </div>
      </div>

      {/* Sequential Pipeline Nodes */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute left-[50%] top-0 bottom-0 w-[1px] bg-white/5 -translate-x-1/2" />
        
        <div className="grid grid-cols-1 gap-6">
          {stages.map((stage, idx) => {
            const isActive = idx === currentIdx;
            const isDone = idx < currentIdx || stage.status === 'completed';
            const isFailed = stage.status === 'failed';

            return (
              <motion.div 
                key={stage.id}
                className="relative flex items-center justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                {/* Node Label (Left) */}
                <div className="absolute right-[calc(50%+2rem)] text-right w-48">
                  <span className={`text-[10px] font-mono uppercase tracking-[0.2em] transition-colors duration-500 ${
                    isActive ? 'text-cyan-400' : isDone ? 'text-zinc-500' : 'text-zinc-700'
                  }`}>
                    {stage.name}
                  </span>
                </div>

                {/* Node Point (Center) */}
                <div className="relative z-10">
                  <motion.div 
                    className={`w-3 h-3 rounded-full border transition-all duration-500 ${
                      isActive ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' :
                      isDone ? 'bg-zinc-800 border-zinc-700' :
                      isFailed ? 'bg-rose-600 border-rose-500' :
                      'bg-black border-zinc-800'
                    }`}
                    animate={isActive ? { scale: [1, 1.4, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>

                {/* Status Indicator (Right) */}
                <div className="absolute left-[calc(50%+2rem)] w-48">
                  <AnimatePresence mode="wait">
                    {isActive ? (
                      <motion.div 
                        key="loading"
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                      >
                        <div className="flex gap-0.5">
                          {[0, 1, 2].map(i => (
                            <motion.div
                              key={i}
                              className="w-1 h-1 bg-cyan-500"
                              animate={{ opacity: [0.2, 1, 0.2] }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                            />
                          ))}
                        </div>
                        <span className="text-[9px] font-mono text-cyan-500 uppercase italic">Analyzing...</span>
                      </motion.div>
                    ) : isDone ? (
                      <motion.span 
                        key="done"
                        className="text-[9px] font-mono text-zinc-600 uppercase"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {stage.duration_ms ? `${(stage.duration_ms / 1000).toFixed(2)}s` : 'OK'}
                      </motion.span>
                    ) : isFailed ? (
                      <span className="text-[9px] font-mono text-rose-500 uppercase tracking-tighter italic">Critical Error</span>
                    ) : null}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProcessingPipelineVisualizer;
