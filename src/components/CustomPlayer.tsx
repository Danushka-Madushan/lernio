'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface CustomPlayerProps {
  /** The video database ID. The player calls /api/videos/[videoId]/stream
   *  which is a server-side proxy that forwards Range requests to R2.
   *  The real R2 URL is never sent to the browser. */
  videoId: string;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function CustomPlayer({ videoId }: CustomPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0); // visual buffer bar
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState('');
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── New: playback rate ───────────────────────────────────────────────────────
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // ── New: scrub preview tooltip ───────────────────────────────────────────────
  const [scrubPct, setScrubPct] = useState<number | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);

  // ── New: fullscreen icon state ───────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    setScrubPct(null);
    setIsSeeking(false);
  }, [videoId]);

  // ── Auto-hide controls after 3 s of inactivity ──────────────────────────────
  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying && !showSpeedMenu && !isSeeking) setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  // ── Fullscreen state tracking (so the icon reflects reality) ────────────────
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
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

  const skip = (delta: number) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    v.currentTime = Math.min(Math.max(v.currentTime + delta, 0), duration);
    resetControlsTimer();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const pct = Number(e.target.value);
    v.currentTime = (pct / 100) * duration;
    setProgress(pct);
  };

  const handleSeekHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
    setScrubPct((x / rect.width) * 100);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = Number(e.target.value);
    v.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const changeVolumeBy = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    const val = Math.min(1, Math.max(0, (isMuted ? 0 : volume) + delta));
    v.volume = val;
    v.muted = val === 0;
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
      el.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  };

  const handleSpeedChange = (rate: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    resetControlsTimer();
  };

  const handleRetry = () => {
    setError('');
    setIsBuffering(true);
    videoRef.current?.load();
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

  // ── Keyboard shortcuts (Space, arrows, F, M, Ctrl+S block) ───────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        resetControlsTimer();
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        skip(5);
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skip(-5);
      }
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        changeVolumeBy(0.1);
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        changeVolumeBy(-0.1);
      }
      if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
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
  }, [isPlaying, duration, volume, isMuted]);

  // ── Format helper ────────────────────────────────────────────────────────────
  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${sec}` : `${m}:${sec}`;
  };

  const scrubTime = ((isSeeking ? progress : scrubPct) ?? 0) / 100 * duration;
  const tooltipLeft = Math.min(97, Math.max(3, isSeeking ? progress : scrubPct ?? 0));

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      onMouseMove={resetControlsTimer}
      onMouseEnter={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      className="group relative flex w-full aspect-video select-none items-center justify-center overflow-hidden rounded-2xl bg-[#0A0C10] shadow-[0_1px_2px_0_rgba(0,0,0,0.4),0_12px_28px_-6px_rgba(0,0,0,0.55)] ring-1 ring-white/5"
    >
      {/* ── Buffering spinner ── */}
      {isBuffering && !error && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50"
        >
          <Loader2 size={32} className="mb-2 animate-spin text-primary" />
          <p className="text-xs font-medium text-white/70">Loading…</p>
        </div>
      )}

      {/* ── Error state ── */}
      {error && (
        <div
          role="alert"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#0A0C10] px-6 text-center"
        >
          <AlertCircle size={30} className="text-danger" />
          <p className="max-w-xs text-xs font-medium text-white/80">{error}</p>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <RefreshCw size={13} />
            Try again
          </button>
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
        onClick={() => {
          togglePlay();
          resetControlsTimer();
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          setShowControls(true);
        }}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => setIsBuffering(false)}
        onTimeUpdate={handleTimeUpdate}
        onProgress={handleProgress}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
            videoRef.current.playbackRate = playbackRate;
          }
          setIsBuffering(false);
        }}
        onError={() => {
          setError('Could not load video. Check your connection or contact support.');
          setIsBuffering(false);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setShowControls(true);
          setProgress(100);
        }}
        className="h-full w-full object-contain"
        aria-label="Video Player"
      />

      {/* ── Center tap-to-play affordance (hidden while playing/buffering/error) ── */}
      {!isPlaying && !isBuffering && !error && (
        <button
          onClick={() => {
            togglePlay();
            resetControlsTimer();
          }}
          aria-label="Play"
          className="absolute inset-0 z-10 m-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm ring-1 ring-white/20 transition-transform hover:scale-105 hover:bg-black/55 focus-visible:outline-none focus-visible:ring-primary"
        >
          <Play size={26} className="ml-0.5" />
        </button>
      )}

      {/* ── Custom controls overlay (auto-hides on idle) ── */}
      <div
        className={`absolute bottom-0 left-0 right-0 px-3 sm:px-4 pb-3 sm:pb-4 pt-10
          bg-linear-to-t from-black/85 via-black/45 to-transparent
          flex flex-col gap-2 sm:gap-2.5
          transition-opacity duration-300
          ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Seek / buffer bar */}
        <div
          className="group/seek relative h-3 flex items-center"
          onMouseMove={handleSeekHover}
          onMouseLeave={() => setScrubPct(null)}
        >
          {/* Scrub time tooltip */}
          {duration > 0 && (scrubPct !== null || isSeeking) && (
            <div
              className="pointer-events-none absolute -top-6 -translate-x-1/2 rounded-md bg-[#12151C] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white shadow-md ring-1 ring-white/10"
              style={{ left: `${tooltipLeft}%` }}
            >
              {fmt(scrubTime)}
            </div>
          )}
          {/* Base track */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/15" />
          {/* Buffer track */}
          <div
            className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/30"
            style={{ width: `${buffered}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSeek}
            onMouseDown={() => setIsSeeking(true)}
            onMouseUp={() => setIsSeeking(false)}
            onTouchStart={() => setIsSeeking(true)}
            onTouchEnd={() => setIsSeeking(false)}
            style={{
              background: `linear-gradient(to right, var(--accent) ${progress}%, transparent ${progress}%)`,
            }}
            className="relative h-1 w-full cursor-pointer appearance-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(242,169,78,0.25)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary"
            aria-label="Seek"
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between text-white">
          {/* Left: play/pause + skip + volume + time */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 min-w-0">
            <button
              onClick={() => {
                togglePlay();
                resetControlsTimer();
              }}
              className="rounded-full p-2 transition-colors hover:bg-white/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={17} /> : <Play size={17} />}
            </button>

            <button
              onClick={() => skip(-10)}
              className="relative rounded-full p-2 transition-colors hover:bg-white/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw size={19} />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center pt-0.75 text-[8px] font-bold">
                10
              </span>
            </button>

            <button
              onClick={() => skip(10)}
              className="relative rounded-full p-2 transition-colors hover:bg-white/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Forward 10 seconds"
            >
              <RotateCw size={19} />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center pt-0.75 text-[8px] font-bold">
                10
              </span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 ml-0.5">
              <button
                onClick={toggleMute}
                className="rounded-full p-2 transition-colors hover:bg-white/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                style={{
                  background: `linear-gradient(to right, var(--accent-soft) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%)`,
                }}
                className="h-1 w-16 cursor-pointer appearance-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
                  [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white"
                aria-label="Volume"
              />
            </div>

            <span className="ml-1 shrink-0 text-[11px] tabular-nums text-white/70">
              {fmt(currentTime)} / {fmt(duration)}
            </span>
          </div>

          {/* Right: speed + fullscreen */}
          <div className="flex items-center gap-0.5 sm:gap-1 relative shrink-0">
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu((s) => !s)}
                className="rounded-full px-2 py-1.5 text-[11px] font-semibold tabular-nums transition-colors hover:bg-white/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Playback speed"
                aria-expanded={showSpeedMenu}
              >
                {playbackRate}×
              </button>
              {showSpeedMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSpeedMenu(false)} />
                  <div className="absolute bottom-full right-0 z-20 mb-2 w-16 overflow-hidden rounded-lg bg-[#12151C] py-1 shadow-lg ring-1 ring-white/10">
                    {SPEED_OPTIONS.map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handleSpeedChange(rate)}
                        className={`block w-full px-2 py-1 text-center text-[11px] tabular-nums transition-colors hover:bg-white/10 ${rate === playbackRate ? 'text-primary' : 'text-white/80'
                          }`}
                      >
                        {rate}×
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => {
                toggleFullScreen();
                resetControlsTimer();
              }}
              className="rounded-full p-2 transition-colors hover:bg-white/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
