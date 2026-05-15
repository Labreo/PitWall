import React, { useState, useEffect } from 'react';
import { useCoachingStore } from '../../store/coachingStore';

export const EngineerRadioDebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const store = useCoachingStore();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'D') {
        setIsVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isVisible) return null;

  const synthSupported = 'speechSynthesis' in window;

  return (
    <div className="fixed top-24 right-8 z-[1000] bg-black/90 backdrop-blur-md border border-cyan-500/30 p-4 rounded-lg w-72 font-mono shadow-2xl">
      <div className="flex justify-between items-center mb-3 border-b border-cyan-500/20 pb-2">
        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Radio Debug</span>
        <span className="text-[9px] text-slate-500">SHIFT + D to hide</span>
      </div>

      <div className="space-y-2 text-[10px]">
        <div className="flex justify-between">
          <span className="text-slate-400">Synth Supported:</span>
          <span className={synthSupported ? 'text-green-400' : 'text-red-400'}>
            {synthSupported ? 'YES' : 'NO'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Audio Unlocked:</span>
          <span className={store.isUnlocked ? 'text-green-400' : 'text-yellow-400'}>
            {store.isUnlocked ? 'UNLOCKED' : 'LOCKED'}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Queue Length:</span>
          <span className="text-white">{store.queue.length}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Status:</span>
          <span className="text-cyan-400 uppercase">{store.playbackStatus}</span>
        </div>

        <div className="mt-4 pt-2 border-t border-cyan-500/10">
          <span className="text-slate-500 block mb-1 uppercase text-[8px]">Active Message:</span>
          <div className="text-white/80 bg-white/5 p-2 rounded leading-relaxed min-h-[40px]">
            {store.activeEvent ? store.activeEvent.message : '—'}
          </div>
        </div>

        <div className="mt-2">
          <span className="text-slate-500 block mb-1 uppercase text-[8px]">Last Corner:</span>
          <span className="text-cyan-400">{store.activeEvent?.corner_id || '—'}</span>
        </div>
      </div>
    </div>
  );
};
