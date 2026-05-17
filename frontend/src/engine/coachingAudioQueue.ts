import { radioAudioEngine } from '../audio/RadioAudioEngine';

// Maintain backward compatibility with the existing coaching scheduler, replay engine, and HUD imports.
export const coachingAudioQueue = radioAudioEngine;
export default coachingAudioQueue;
