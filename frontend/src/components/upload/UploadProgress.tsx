import React, { useEffect, useState } from 'react';
import ProcessingPipelineVisualizer from './ProcessingPipelineVisualizer';
import ReplayRevealTransition from './ReplayRevealTransition';

interface Stage {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  duration_ms?: number;
}

interface PipelineState {
  session_id: string;
  current_stage_index: number;
  stages: Stage[];
  overall_status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface UploadProgressProps {
  sessionId: string;
  onComplete: () => void;
}

const UploadProgress: React.FC<UploadProgressProps> = ({ sessionId, onComplete }) => {
  const [state, setState] = useState<PipelineState | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    let interval: any;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/status/${sessionId}`);
        const data = await response.json();
        setState(data);

        if (data.overall_status === 'completed') {
          clearInterval(interval);
          setTimeout(() => {
            setIsTransitioning(true);
            setTimeout(onComplete, 2000);
          }, 1500);
        } else if (data.overall_status === 'failed') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Failed to fetch status:", err);
      }
    };

    interval = setInterval(fetchStatus, 1000);
    fetchStatus();

    return () => clearInterval(interval);
  }, [sessionId, onComplete]);

  if (!state) return null;

  return (
    <ReplayRevealTransition isRevealing={isTransitioning}>
      <div className="w-full h-screen flex flex-col items-center justify-center p-6">
        <div className="text-center mb-12 space-y-2">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.4em]">
            Sequence Initialized
          </span>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase">
            Constructing Intelligence
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-[1px] bg-white/10" />
            <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
              Session {sessionId.slice(0, 8)}
            </span>
            <div className="w-12 h-[1px] bg-white/10" />
          </div>
        </div>

        <ProcessingPipelineVisualizer 
          stages={state.stages} 
          currentIdx={state.current_stage_index} 
        />

        {state.overall_status === 'failed' && (
          <div className="mt-12 space-y-4 text-center">
            <p className="text-[10px] font-mono text-rose-500 uppercase tracking-widest animate-pulse">
              System Breach / Processing Fault
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-2 rounded-sm border border-rose-500/30 text-[10px] font-mono text-rose-500 uppercase hover:bg-rose-500/10 transition-colors"
            >
              Restart Core
            </button>
          </div>
        )}
      </div>
    </ReplayRevealTransition>
  );
};

export default UploadProgress;
