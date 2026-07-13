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
      className="relative flex items-center justify-center w-full aspect-video bg-black rounded-radius-md overflow-hidden border border-[#141a20] group select-none"
    >
      {/* ── Buffering spinner (shows while canplay not yet fired) ── */}
      {isBuffering && !error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 pointer-events-none">
          <Loader2 size={36} className="animate-spin text-surface-raised mb-2" />
          <p className="text-xs text-text-tertiary">Loading…</p>
        </div>
      )}

      {/* ── Error state ── */}
      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black gap-2">
          <AlertCircle size={32} className="text-red-500" />
          <p className="text-xs text-red-400 font-semibold">{error}</p>
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
        className="w-full h-full object-contain"
        aria-label="Video Player"
      />

      {/* ── Custom controls overlay (auto-hides on idle) ── */}
      <div
        className={`absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8
          bg-gradient-to-t from-black/85 via-black/40 to-transparent
          flex flex-col gap-2
          transition-opacity duration-300
          ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Seek / buffer bar */}
        <div className="relative w-full h-1 group/seek">
          {/* Buffer track */}
          <div
            className="absolute inset-y-0 left-0 bg-white/20 rounded-full pointer-events-none"
            style={{ width: `${buffered}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSeek}
            className="relative w-full h-1 rounded-full cursor-pointer appearance-none bg-white/10 accent-surface-raised focus:outline-none"
            aria-label="Seek"
          />
        </div>

        {/* Controls row */}
        <div className="flex justify-between items-center text-white">
          {/* Left: play/pause + volume + time */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { togglePlay(); resetControlsTimer(); }}
              className="hover:text-surface-raised transition-colors focus:outline-none"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="hover:text-surface-raised transition-colors focus:outline-none"
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
                className="w-16 h-1 cursor-pointer appearance-none bg-white/20 accent-surface-raised rounded-full focus:outline-none"
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
            className="hover:text-surface-raised transition-colors focus:outline-none"
            aria-label="Toggle fullscreen"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
