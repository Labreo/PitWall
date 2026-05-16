import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isRevealing: boolean;
  children: React.ReactNode;
}

const ReplayRevealTransition: React.FC<Props> = ({ isRevealing, children }) => {
  return (
    <div className="relative w-full h-full">
      <AnimatePresence>
        {!isRevealing ? (
          <motion.div
            key="content"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(20px)' }}
            transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        ) : (
          <motion.div
            key="shutter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center pointer-events-none"
          >
            <motion.div 
              className="w-1 h-32 bg-cyan-500 mb-8"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: [0, 1, 0] }}
              transition={{ duration: 2, times: [0, 0.5, 1], ease: "easeInOut" }}
            />
            <motion.span 
              className="text-xs font-mono text-cyan-500 uppercase tracking-[0.5em] animate-pulse"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Initializing Replay Engine
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReplayRevealTransition;
