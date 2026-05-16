import { useState, useEffect } from 'react';
import { ReplayLayout } from './components/replay/ReplayLayout';
import { TelemetryPoint, Segment, Lap } from './types/telemetry';
import { deriveGForces } from './utils/deriveGForces';
import UploadScreen from './components/upload/UploadScreen';

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

        // Try loading laps.json — fall back to a single synthesised lap
        let lapsData: Lap[];
        try {
          const lapsRes = await fetch('/data/laps.json');
          if (lapsRes.ok) {
            lapsData = await lapsRes.json();
          } else {
            throw new Error('no laps.json');
          }
        } catch {
          // Synthesise a single lap from session bounds
          const sessionStart = telemetryData[0].timestamp;
          const sessionEnd = telemetryData[telemetryData.length - 1].timestamp;
          lapsData = [{
            lap_number: 1,
            start_timestamp: sessionStart,
            end_timestamp: sessionEnd,
            lap_duration_seconds: (sessionEnd - sessionStart) / 1000,
          }];
        }

        // Try loading session_info.json
        try {
          const infoRes = await fetch('/data/session_info.json');
          if (infoRes.ok) {
            setSessionInfo(await infoRes.json());
          }
        } catch (err) {
          console.warn("Could not load session info:", err);
        }

        // Derive G-forces from GPS data (raw accelerometer fields are zero)
        deriveGForces(telemetryData);

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
