import { useState, useEffect } from 'react';
import { ReplayLayout } from './components/replay/ReplayLayout';
import { TelemetryPoint, Segment, Lap } from './types/telemetry';
import { deriveGForces } from './utils/deriveGForces';
import UploadScreen from './components/upload/UploadScreen';
import { loadDemoSession } from './utils/staticSessionLoader';
import { useReplayStore } from './store/replayStore';

type LoadState = 'loading' | 'ready' | 'error';
type ViewState = 'upload' | 'replay';

function App() {
  const [view, setView] = useState<ViewState>('upload');
  const [telemetry, setTelemetry] = useState<TelemetryPoint[] | null>(null);
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [laps, setLaps] = useState<Lap[] | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{ filename: string; date: string } | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  // Effect to sync view with URL hash for simple routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'replay') {
        setView('replay');
      } else {
        setView('upload');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (view !== 'replay') return;

    const loadData = async () => {
      setLoadState('loading');
      try {
        // First, check if we are in demo mode (Vercel deployment or explicit hash)
        const isLocal = window.location.hostname === 'localhost';
        const forceDemo = window.location.hash === '#demo';
        
        let shouldLoadDemo = !isLocal || forceDemo;

        // If local and not forcing demo, we should check if backend is alive
        // But for simplicity of this task, I'll use a simpler heuristic:
        // If we are at /#replay and not /#demo, we try local first.
        
        let sessionData;
        if (shouldLoadDemo) {
          console.log('🏁 Loading Production Demo Session...');
          sessionData = await loadDemoSession();
          
          // Sync with ReplayStore
          const store = useReplayStore.getState();
          store.setIsDemo(true);
          store.initializeSession(sessionData.telemetry, sessionData.laps, sessionData.segments);
          
          // Load theoretical best if available
          try {
            const tRes = await fetch('/demo/theoretical_best.json');
            if (tRes.ok) {
              const tData = await tRes.json();
              store.setTheoreticalLapData(tData);
            }
          } catch (e) {
            console.warn('Could not load pre-cached theoretical lap', e);
          }

          // Derive G-forces from GPS data (if raw fields are zero)
          deriveGForces(sessionData.telemetry);

          setTelemetry(sessionData.telemetry);
          setSegments(sessionData.segments);
          setLaps(sessionData.laps);
          setSessionInfo(sessionData.session);
          setLoadState('ready');
          setView('replay');
          return;
        }

        // Standard Local Backend Load (Fallback)
        useReplayStore.getState().setIsDemo(false);
        const [telemetryRes, segmentsRes] = await Promise.all([
          fetch('/data/normalized_session.json'),
          fetch('/data/segments.json'),
        ]);

        if (!telemetryRes.ok) throw new Error(`normalized_session.json: ${telemetryRes.status}`);
        if (!segmentsRes.ok) throw new Error(`segments.json: ${segmentsRes.status}`);

        const [telemetryData, segmentsData]: [TelemetryPoint[], Segment[]] = await Promise.all([
          telemetryRes.json(),
          segmentsRes.json(),
        ]);

        // ... existing local load logic ...
        let lapsData: Lap[];
        const lapsRes = await fetch('/data/laps.json');
        lapsData = lapsRes.ok ? await lapsRes.json() : [];

        setTelemetry(telemetryData);
        setSegments(segmentsData);
        setLaps(lapsData);
        setLoadState('ready');
      } catch (error) {
        console.error('Error loading data:', error);
        setErrorMsg(String(error));
        setLoadState('error');
      }
    };

    loadData();
  }, [view]);

  if (view === 'upload') {
    return <UploadScreen onComplete={() => window.location.hash = 'replay'} />;
  }

  if (loadState === 'loading') {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#020408] gap-3">
        <div className="text-cyan-400 font-mono text-sm tracking-widest animate-pulse">
          LOADING TELEMETRY...
        </div>
        <div className="w-32 h-[2px] rounded-full overflow-hidden bg-slate-800">
          <div className="h-full bg-cyan-500 animate-[slide_1.2s_ease-in-out_infinite]"
            style={{ width: '40%' }} />
        </div>
      </div>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#020408] gap-4">
        <div className="text-red-400 font-mono text-sm tracking-widest">DATA LOAD FAILED</div>
        <div className="text-slate-500 font-mono text-xs max-w-sm text-center">{errorMsg}</div>
        <div className="flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-1.5 rounded border border-cyan-500/30 text-cyan-400 font-mono text-xs tracking-widest hover:bg-cyan-500/10 transition-colors"
          >
            RETRY
          </button>
          <button
            onClick={() => window.location.hash = 'upload'}
            className="mt-2 px-4 py-1.5 rounded border border-rose-500/30 text-rose-400 font-mono text-xs tracking-widest hover:bg-rose-500/10 transition-colors"
          >
            BACK TO UPLOAD
          </button>
        </div>
      </div>
    );
  }

  return <ReplayLayout 
    telemetry={telemetry!} 
    segments={segments!} 
    laps={laps!} 
    sessionInfo={sessionInfo} 
  />;
}

export default App;
