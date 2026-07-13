'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface CustomPlayerProps {
  /** The video database ID. The player calls /api/videos/[videoId]/stream
   *  which is a server-side proxy that forwards Range requests to R2.
   *  The real R2 URL is never sent to the browser. */
  videoId: string;
}

export default function CustomPlayer({ videoId }: CustomPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);   // visual buffer bar
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState('');
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The stream URL — points at our secure proxy, not R2 directly
  const streamUrl = `/api/videos/${videoId}/stream`;

  // Reset player state whenever the video changes
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setBuffered(0);
    setDuration(0);
    setCurrentTime(0);
    setIsBuffering(true);
    setError('');
  }, [videoId]);

  // ── Auto-hide controls after 3 s of inactivity ──────────────────────────────
  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  // ── Playback controls ────────────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => setError('Playback failed. Try refreshing.'));
    } else {
      v.pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const pct = Number(e.target.value);
    v.currentTime = (pct / 100) * duration;
    setProgress(pct);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = Number(e.target.value);
    v.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullScreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // ── Video element event handlers ─────────────────────────────────────────────
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const dur = v.duration || 0;
    const cur = v.currentTime;
    setCurrentTime(cur);
    if (dur > 0) setProgress((cur / dur) * 100);

    // Update buffered range
    if (v.buffered.length > 0) {
      const bufferedEnd = v.buffered.end(v.buffered.length - 1);
      setBuffered((bufferedEnd / dur) * 100);
    }
  };

  const handleProgress = () => {
    const v = videoRef.current;
    if (!v || v.duration === 0) return;
    if (v.buffered.length > 0) {
      const bufferedEnd = v.buffered.end(v.buffered.length - 1);
      setBuffered((bufferedEnd / v.duration) * 100);
    }
  };

  // ── Keyboard shortcuts (Space, F, Ctrl+S block) ──────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        resetControlsTimer();
      }
      if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullScreen();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying]);

  // ── Format helper ────────────────────────────────────────────────────────────
  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      onMouseMove={resetControlsTimer}
      onMouseEnter={resetControlsTimer}
      className="group relative flex w-full aspect-video select-none items-center justify-center overflow-hidden rounded-2xl bg-black shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]"
    >
      {/* ── Buffering spinner (shows while canplay not yet fired) ── */}
      {isBuffering && !error && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60">
          <Loader2 size={36} className="mb-2 animate-spin text-[#8ab4f8]" />
          <p className="text-xs text-white/70">Loading…</p>
        </div>
      )}

      {/* ── Error state ── */}
      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black">
          <AlertCircle size={32} className="text-[#f28b82]" />
          <p className="text-xs font-medium text-[#f28b82]">{error}</p>
        </div>
      )}

      {/* ── The video element — src points at the streaming proxy ── */}
      <video
        ref={videoRef}
        src={streamUrl}
        controlsList="nodownload"
        disablePictureInPicture
        playsInline
        preload="metadata"
        onClick={() => { togglePlay(); resetControlsTimer(); }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => { setIsPlaying(false); setShowControls(true); }}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => setIsBuffering(false)}
        onTimeUpdate={handleTimeUpdate}
        onProgress={handleProgress}
        onLoadedMetadata={() => {
          if (videoRef.current) setDuration(videoRef.current.duration);
          setIsBuffering(false);
        }}
        onError={() => {
          setError('Could not load video. Check your connection or contact support.');
          setIsBuffering(false);
        }}
        onEnded={() => { setIsPlaying(false); setShowControls(true); setProgress(100); }}
        className="h-full w-full object-contain"
        aria-label="Video Player"
      />

      {/* ── Custom controls overlay (auto-hides on idle) ── */}
      <div
        className={`absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10
          bg-linear-to-t from-black/85 via-black/40 to-transparent
          flex flex-col gap-2.5
          transition-opacity duration-300
          ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Seek / buffer bar */}
        <div className="group/seek relative h-1 w-full">
          {/* Buffer track */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-white/25"
            style={{ width: `${buffered}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSeek}
            className="relative h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-[#8ab4f8] focus:outline-none"
            aria-label="Seek"
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between text-white">
          {/* Left: play/pause + volume + time */}
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => { togglePlay(); resetControlsTimer(); }}
              className="transition-colors hover:text-[#8ab4f8] focus:outline-none"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="transition-colors hover:text-[#8ab4f8] focus:outline-none"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/25 accent-[#8ab4f8] focus:outline-none"
                aria-label="Volume"
              />
            </div>

            <span className="text-[11px] tabular-nums text-white/70">
              {fmt(currentTime)} / {fmt(duration)}
            </span>
          </div>

          {/* Right: fullscreen */}
          <button
            onClick={toggleFullScreen}
            className="transition-colors hover:text-[#8ab4f8] focus:outline-none"
            aria-label="Toggle fullscreen"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
