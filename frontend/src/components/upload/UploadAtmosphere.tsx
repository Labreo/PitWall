import React from 'react';
import { motion } from 'framer-motion';

const UploadAtmosphere: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      {/* Atmosphere Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-900/10 blur-[120px] rounded-full" />
      
      {/* Reconstructed Track Outline (Faded) */}
      <svg 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] opacity-[0.03]"
        viewBox="0 0 100 100"
      >
        <motion.path
          d="M 20,50 Q 25,20 50,20 Q 75,20 80,50 Q 75,80 50,80 Q 25,80 20,50"
          fill="none"
          stroke="white"
          strokeWidth="0.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
      </svg>

      {/* Dynamic Contour Lines */}
      <div className="absolute inset-0 opacity-10">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 border border-white/5 rounded-full"
            initial={{ scale: 0.8 + i * 0.1, opacity: 0 }}
            animate={{ 
              scale: [0.8 + i * 0.1, 1.2 + i * 0.1],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              delay: i * 1.5,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default UploadAtmosphere;
