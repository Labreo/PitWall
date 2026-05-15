import React, { useEffect, useRef, memo } from 'react';
import { useReplayStore } from '../../store/replayStore';

const SEEK_THRESHOLD_S = 0.35; // only seek if video is more than 350ms off

const VideoBackgroundComponent: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isPlayingRef = useRef(false);
  const playbackSpeedRef = useRef(1.0);

  // Sync play/pause and speed via store subscription (no re-render)
  useEffect(() => {
    const unsub = useReplayStore.subscribe((state) => {
      const video = videoRef.current;
      if (!video) return;

      const { isPlaying, playbackSpeed, currentTimestamp } = state;

      // Sync speed
      if (video.playbackRate !== playbackSpeed) {
        video.playbackRate = playbackSpeed;
        playbackSpeedRef.current = playbackSpeed;
      }

      // Seek if timestamp diverged (scrub or large jump)
      const targetTime = currentTimestamp / 1000;
      if (Math.abs(video.currentTime - targetTime) > SEEK_THRESHOLD_S) {
        video.currentTime = targetTime;
      }

      // Play/pause
      if (isPlaying && video.paused) {
        video.play().catch(() => {});
        isPlayingRef.current = true;
      } else if (!isPlaying && !video.paused) {
        video.pause();
        isPlayingRef.current = false;
      }
    });
    return unsub;
  }, []);

  return (
    <video
      ref={videoRef}
      src="/session.mp4"
      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      style={{ zIndex: 0, opacity: 0.45 }}
      muted
      playsInline
      preload="auto"
    />
  );
};

export const VideoBackground = memo(VideoBackgroundComponent);
