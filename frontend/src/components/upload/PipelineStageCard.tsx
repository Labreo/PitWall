import React from 'react';
import { CheckCircle, Circle, Loader2, AlertCircle } from 'lucide-react';

interface StageProps {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  duration?: number;
}

const PipelineStageCard: React.FC<StageProps> = ({ name, status, error, duration }) => {
  const getIcon = () => {
    switch (status) {
      case 'completed': return <CheckCircle className="text-emerald-400 w-5 h-5" />;
      case 'processing': return <Loader2 className="text-blue-400 w-5 h-5 animate-spin" />;
      case 'failed': return <AlertCircle className="text-rose-500 w-5 h-5" />;
      default: return <Circle className="text-zinc-600 w-5 h-5" />;
    }
  };

  return (
    <div className={`p-4 rounded-lg border transition-all duration-300 ${
      status === 'processing' ? 'bg-zinc-800/50 border-blue-500/50 shadow-lg shadow-blue-500/10' :
      status === 'completed' ? 'bg-zinc-900/30 border-emerald-500/20' :
      status === 'failed' ? 'bg-rose-900/10 border-rose-500/30' :
      'bg-zinc-900/20 border-zinc-800'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getIcon()}
          <span className={`font-medium ${
            status === 'pending' ? 'text-zinc-500' : 'text-zinc-200'
          }`}>
            {name}
          </span>
        </div>
        {duration && status === 'completed' && (
          <span className="text-xs font-mono text-zinc-500">
            {(duration / 1000).toFixed(1)}s
          </span>
        )}
      </div>
      {error && (
        <p className="mt-2 text-xs text-rose-400 pl-8 leading-relaxed">
          {error}
        </p>
      )}
    </div>
  );
};

export default PipelineStageCard;
