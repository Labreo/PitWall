import { useState, useEffect } from 'react';
import { ReplayLayout } from './components/replay/ReplayLayout';
import { TelemetryPoint, Segment, Lap } from './types/telemetry';

function App() {
  const [telemetry, setTelemetry] = useState<TelemetryPoint[] | null>(null);
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [laps, setLaps] = useState<Lap[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [telemetryRes, segmentsRes, lapsRes] = await Promise.all([
          fetch('/data/normalized_session.json'),
          fetch('/data/segments.json'),
          fetch('/data/laps.json'),
        ]);

        if (!telemetryRes.ok || !segmentsRes.ok || !lapsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const [telemetryData, segmentsData, lapsData] = await Promise.all([
          telemetryRes.json(),
          segmentsRes.json(),
          lapsRes.json(),
        ]);

        setTelemetry(telemetryData);
        setSegments(segmentsData);
        setLaps(lapsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading || !telemetry || !segments || !laps) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[#020408]">
        <div className="text-cyan-400 font-mono text-sm tracking-widest animate-pulse">
          LOADING TELEMETRY...
        </div>
      </div>
    );
  }

  return <ReplayLayout telemetry={telemetry} segments={segments} laps={laps} />;
}

export default App;
