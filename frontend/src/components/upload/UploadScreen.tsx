import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldCheck, ChevronRight } from 'lucide-react';
import UploadProgress from './UploadProgress';
import TelemetryGridBackground from './TelemetryGridBackground';
import UploadAtmosphere from './UploadAtmosphere';

interface UploadScreenProps {
  onComplete: () => void;
}

const UploadScreen: React.FC<UploadScreenProps> = ({ onComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setTransferring(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('UPLOAD_FAILURE');

      const data = await response.json();
      setSessionId(data.session_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SYSTEM_FAULT');
      setUploading(false);
      setTransferring(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/mp4': ['.mp4'], 'video/quicktime': ['.mov'] },
    multiple: false,
    disabled: uploading,
  });

  return (
    <div className="relative min-h-screen bg-[#050505] overflow-hidden selection:bg-cyan-500/30">
      <TelemetryGridBackground />
      <UploadAtmosphere />

      <AnimatePresence mode="wait">
        {!sessionId ? (
          <motion.div 
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6"
          >
            {/* Header Section */}
            <div className="text-center mb-20 space-y-4">
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono text-zinc-400 uppercase tracking-[0.3em]"
              >
                <Activity className="w-3 h-3 text-cyan-500" />
                Telemetry Ingest Engine v2.4
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center"
              >
                <img src="/logo.png" alt="PitWall Logo" className="w-[380px] h-auto drop-shadow-[0_0_30px_rgba(34,211,238,0.2)]" />
              </motion.div>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-zinc-500 text-xs font-mono uppercase tracking-[0.2em] max-w-xs mx-auto leading-relaxed"
              >
                Initialize analytical session from source video
              </motion.p>
            </div>

            {/* Dropzone Environment */}
            <div 
              {...getRootProps()} 
              className={`relative w-full max-w-xl aspect-[21/9] group ${transferring ? 'cursor-wait' : 'cursor-pointer'}`}
            >
              <input {...getInputProps()} />
              
              <motion.div 
                className={`absolute inset-0 rounded-sm border transition-colors duration-700 ${
                  transferring ? 'bg-cyan-500/5 border-cyan-500/20' :
                  isDragActive ? 'bg-cyan-500/10 border-cyan-500' : 
                  'bg-white/[0.02] border-white/5 group-hover:border-white/20'
                }`}
                whileHover={!transferring ? { scale: 1.01 } : {}}
                whileTap={!transferring ? { scale: 0.99 } : {}}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  {transferring ? (
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative w-12 h-12">
                        <motion.div 
                          className="absolute inset-0 border-2 border-cyan-500/30 rounded-full"
                          animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Activity className="w-6 h-6 text-cyan-500 animate-pulse" />
                        </div>
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-[10px] font-mono text-cyan-500 uppercase tracking-[0.4em] animate-pulse">
                          Transferring Source Data
                        </p>
                        <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.2em]">
                          Encrypting & Uploading Binary Stream
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`p-4 rounded-full transition-all duration-700 ${
                        isDragActive ? 'bg-cyan-500 text-black' : 'bg-white/5 text-zinc-500 group-hover:text-zinc-300'
                      }`}>
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-mono text-white uppercase tracking-[0.4em]">
                          {isDragActive ? 'Release to Ingest' : 'Awaiting Source'}
                        </p>
                        <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mt-1">
                          Drag and drop MP4 session file
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Subtle corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/20" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/20" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/20" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/20" />
              </motion.div>
            </div>

            {/* Footer Metrics */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-24 grid grid-cols-3 gap-16"
            >
              <StatItem label="Precision" value="HIGH-RES" />
              <StatItem label="Analysis" value="GRANITE" />
              <StatItem label="Mode" value="CINEMATIC" />
            </motion.div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 text-rose-500 font-mono text-[9px] uppercase tracking-widest italic"
              >
                Fault: {error}
              </motion.p>
            )}
          </motion.div>
        ) : (
          <UploadProgress 
            sessionId={sessionId} 
            onComplete={onComplete} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const StatItem = ({ label, value }: { label: string, value: string }) => (
  <div className="text-center space-y-1">
    <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">{label}</p>
    <p className="text-[10px] font-mono text-zinc-300 uppercase tracking-[0.2em]">{value}</p>
  </div>
);

export default UploadScreen;
