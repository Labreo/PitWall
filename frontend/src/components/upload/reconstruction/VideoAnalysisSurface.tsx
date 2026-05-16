import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface VideoAnalysisSurfaceProps {
  videoUrl: string | null;
}

export const VideoAnalysisSurface: React.FC<VideoAnalysisSurfaceProps> = ({ videoUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.playbackRate = 2.0; // Simulate rapid scanning
    }
  }, [videoUrl]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden opacity-40 grayscale contrast-125">
      {videoUrl ? (
        <video 
          ref={videoRef}
          src={videoUrl}
          autoPlay
          muted
          loop
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
          <div className="text-cyan-500/20 font-mono text-xs animate-pulse">
            NO_SIGNAL // WAITING_FOR_STREAM
          </div>
        </div>
      )}

      {/* Cinematic Scanning Overlays */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Horizontal Scanline */}
        <motion.div 
          animate={{ y: ['0%', '1000%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="h-20 w-full bg-gradient-to-b from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 opacity-50"
        />

        {/* Dynamic Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.8)_100%)]" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(34,211,238,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.2) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        {/* AI Focus Reticle */}
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            x: ['-10%', '10%', '-5%', '5%', '0%'],
            y: ['-5%', '5%', '10%', '-10%', '0%']
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-cyan-500/20 rounded-sm"
        >
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,1)]" />
          
          <div className="absolute top-2 left-2 text-[8px] font-mono text-cyan-400/60 uppercase tracking-widest">
            Vision_Core_Active
          </div>
        </motion.div>
      </div>
    </div>
  );
};
