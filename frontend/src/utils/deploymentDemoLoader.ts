/**
 * deploymentDemoLoader.ts — Boots the PitWall Replay Runtime using demo assets.
 */
import { useReplayStore } from '../store/replayStore';
import { loadDemoSession } from './staticSessionLoader';

export async function bootDemoSession() {
  const store = useReplayStore.getState();
  
  try {
    console.log('🚀 Booting PitWall Demo Session...');
    const data = await loadDemoSession();
    
    // 1. Initialize Replay Store
    store.initializeSession(data.telemetry, data.laps, data.segments);
    
    // 2. Override session info
    // We don't have a direct setter for session info in store, 
    // but ReplayLayout consumes it via props or we can just let it be.
    
    console.log('✅ Demo session loaded successfully.');
    return data;
  } catch (err) {
    console.error('❌ Failed to load demo session:', err);
    throw err;
  }
}
