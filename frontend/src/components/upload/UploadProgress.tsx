import React, { useEffect, useState } from 'react';
import { TelemetryReconstructionView } from './reconstruction/TelemetryReconstructionView';

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
  videoUrl: string | null;
  onComplete: () => void;
}

const UploadProgress: React.FC<UploadProgressProps> = ({ sessionId, videoUrl, onComplete }) => {
  const [state, setState] = useState<PipelineState | null>(null);

  useEffect(() => {
    let interval: any;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/status/${sessionId}`);
        const data = await response.json();
        setState(data);

        if (data.overall_status === 'completed' || data.overall_status === 'failed') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Failed to fetch status:", err);
      }
    };

    interval = setInterval(fetchStatus, 1000);
    fetchStatus();

    return () => clearInterval(interval);
  }, [sessionId]);

  if (!state) return null;

  return (
    <TelemetryReconstructionView 
      stage={state.current_stage_index}
      overallStatus={state.overall_status}
      videoUrl={videoUrl}
      onComplete={onComplete}
    />
  );
};

export default UploadProgress;
