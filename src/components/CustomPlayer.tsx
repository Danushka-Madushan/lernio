'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Play, RefreshCw } from 'lucide-react';
import {
  MediaController,
  MediaControlBar,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeRange,
  MediaTimeDisplay,
  MediaMuteButton,
  MediaVolumeRange,
  MediaPlaybackRateButton,
  MediaFullscreenButton,
  MediaLoadingIndicator,
} from 'media-chrome/react';

interface CustomPlayerProps {
  /** The video database ID. The player calls /api/videos/[videoId]/stream
   *  which is a server-side proxy that forwards Range requests to R2.
   *  The real R2 URL is never sent to the browser. */
  videoId: string;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const HIDE_DELAY_MS = 1000;

export default function CustomPlayer({ videoId }: CustomPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [error, setError] = useState('');
  const [showControls, setShowControls] = useState(true);

  const streamUrl = `/api/videos/${videoId}/stream`;

  // ── Activity-based control visibility ───────────────────────────────────────
  // Any pointer/touch/keyboard activity reveals the bar; it auto-hides after a
  // few seconds, but only while the video is actually playing.
  const registerActivity = () => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), HIDE_DELAY_MS);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), HIDE_DELAY_MS);
    } else {
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => setError('Playback failed. Try refreshing.'));
    } else {
      v.pause();
    }
    registerActivity();
  };

  const handleRetry = () => {
    setError('');
    setIsBuffering(true);
    videoRef.current?.load();
  };

  return (
    <MediaController
      onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
      onPointerMove={registerActivity}
      onPointerDown={registerActivity}
      onTouchStart={registerActivity}
      onKeyDown={registerActivity}
      hotkeys="nop noc"
      className={`player-shell group relative flex w-full aspect-video items-center justify-center overflow-hidden rounded-2xl bg-[#05070B] shadow-[0_1px_2px_0_rgba(0,0,0,0.4),0_20px_45px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/5 ${
        showControls ? 'controls-visible' : ''
      }`}
    >
      <video
        ref={videoRef}
        slot="media"
        src={streamUrl}
        disablePictureInPicture
        playsInline
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => setIsBuffering(false)}
        onLoadedMetadata={() => setIsBuffering(false)}
        onError={() => {
          setError('Could not load video. Check your connection or contact support.');
          setIsBuffering(false);
        }}
        className="h-full w-full object-contain"
        aria-label="Video Player"
      />

      {/* ── Full-surface tap/click target — fixes "can't pause on mobile" ── */}
      {!error && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="absolute inset-0 z-0 h-full w-full cursor-pointer bg-transparent"
        />
      )}

      {/* ── Buffering indicator ── */}
      <MediaLoadingIndicator slot="centered-chrome" noAutohide className="pointer-events-none z-5" />

      {/* ── Center play glyph (decorative — the button above handles the tap) ── */}
      {!isPlaying && !isBuffering && !error && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 m-auto flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-full bg-black/40 text-white shadow-lg backdrop-blur-sm ring-1 ring-white/15"
        >
          <Play size={30} className="ml-1" />
        </div>
      )}

      {/* ── Error state ── */}
      {error && (
        <div
          role="alert"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#05070B] px-6 text-center"
        >
          <AlertCircle size={30} className="text-danger" />
          <p className="max-w-xs text-xs font-medium text-white/80">{error}</p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]"
          >
            <RefreshCw size={13} />
            Try again
          </button>
        </div>
      )}

      {/* ── Control bar ── */}
      <MediaControlBar className="control-bar z-30">
        <MediaPlayButton className="ctrl-btn" onClick={registerActivity} />
        <MediaSeekBackwardButton className="ctrl-btn hidden sm:inline-flex" seekOffset={10} onClick={registerActivity} />
        <MediaSeekForwardButton className="ctrl-btn hidden sm:inline-flex" seekOffset={10} onClick={registerActivity} />
        <MediaTimeRange className="time-range flex-1" />
        <MediaTimeDisplay className="ctrl-time hidden sm:inline-flex" showDuration />
        <MediaMuteButton className="ctrl-btn hidden sm:inline-flex" />
        <MediaVolumeRange className="volume-range hidden md:inline-flex" />
        <MediaPlaybackRateButton className="ctrl-btn rate-btn" rates={SPEEDS} onClick={registerActivity} />
        <MediaFullscreenButton className="ctrl-btn" onClick={registerActivity} />
      </MediaControlBar>
    </MediaController>
  );
}
