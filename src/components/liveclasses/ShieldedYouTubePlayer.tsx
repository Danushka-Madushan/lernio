'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Volume1,
  VolumeX,
  Minimize2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Crop,
} from 'lucide-react';

// Declaration for global window.YT from YouTube IFrame API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface ShieldedYouTubePlayerProps {
  /** Class ID for ticket resolution and view tracking */
  classId: string;
  /** Class title displayed in HUD */
  title: string;
  /** Ephemeral signed playback ticket (issued by /api/live-classes/[id]/ticket) */
  ticket: string;
  /** Callback fired when the player session closes */
  onClose?: () => void;
}

const MASK_PRESETS = [
  { label: '2.35:1 Anamorphic', vhTop: 12.5, vhBottom: 13.5, minTopPx: 74, minBottomPx: 86 },
  { label: '2.00:1 Univisium', vhTop: 10.5, vhBottom: 11.5, minTopPx: 68, minBottomPx: 80 },
  { label: '1.85:1 Flat', vhTop: 9.0, vhBottom: 10.5, minTopPx: 64, minBottomPx: 76 },
];

const QUALITY_PRIORITY = ['highres', 'hd2880', 'hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small'];
const PLAYBACK_SPEEDS = [0.75, 1.0, 1.25, 1.5, 2.0];

function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

export default function ShieldedYouTubePlayer({
  classId,
  title,
  ticket,
  onClose,
}: ShieldedYouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overscanBoxRef = useRef<HTMLDivElement>(null);
  const iframeHostRef = useRef<HTMLDivElement>(null);
  const opaqueCurtainRef = useRef<HTMLDivElement>(null);
  const seekSliderRef = useRef<HTMLDivElement>(null);
  const volumeSliderRef = useRef<HTMLDivElement>(null);

  // Core state
  const [player, setPlayer] = useState<any>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isEnded, setIsEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Time & Volume
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [maskIndex, setMaskIndex] = useState(0);

  // HUD & UI Interaction
  const [showHud, setShowHud] = useState(true);
  const [isScrubbingSeek, setIsScrubbingSeek] = useState(false);
  const [isScrubbingVolume, setIsScrubbingVolume] = useState(false);
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null);
  const [hoverSeekPos, setHoverSeekPos] = useState<number>(0);
  const [skipFeedback, setSkipFeedback] = useState<{ side: 'left' | 'right'; count: number } | null>(null);

  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTapRef = useRef<{ time: number; side: string }>({ time: 0, side: '' });
  const closingRef = useRef(false);

  // Reveal HUD with auto-hide timer
  const revealHud = useCallback((pinOpen = false) => {
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    setShowHud(true);

    if (!pinOpen) {
      hudTimerRef.current = setTimeout(() => {
        setShowHud(false);
      }, 2800);
    }
  }, []);

  // Compute 16:9 responsive overscan geometry
  const computeGeometry = useCallback(() => {
    if (!overscanBoxRef.current) return;
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 720;
    const viewportAspect = vw / vh;
    const targetAspect = 16 / 9;

    let boxW = vw;
    let boxH = vh;

    if (viewportAspect < targetAspect) {
      boxW = vw;
      boxH = Math.max(vw / targetAspect, vh * 0.62);
    } else if (viewportAspect > targetAspect) {
      boxW = vw;
      boxH = vw / targetAspect;
    }

    overscanBoxRef.current.style.width = `${Math.ceil(boxW)}px`;
    overscanBoxRef.current.style.height = `${Math.ceil(boxH)}px`;
    overscanBoxRef.current.style.transform = 'scale(1.20)';
  }, []);

  // Synchronous Curtain Engagement
  const engageCurtain = useCallback((visible: boolean) => {
    if (opaqueCurtainRef.current) {
      opaqueCurtainRef.current.style.opacity = visible ? '1' : '0';
      if (visible) {
        // Force synchronous layout flush so native pause UI is completely painted behind curtain
        void opaqueCurtainRef.current.offsetHeight;
      }
    }
  }, []);

  // Enforce Max Quality
  const enforceMaxQuality = useCallback((ytPlayer: any) => {
    if (!ytPlayer || typeof ytPlayer.getAvailableQualityLevels !== 'function') return;
    try {
      const levels = ytPlayer.getAvailableQualityLevels();
      if (Array.isArray(levels) && levels.length > 0) {
        for (const tier of QUALITY_PRIORITY) {
          if (levels.includes(tier)) {
            ytPlayer.setPlaybackQuality(tier);
            if (typeof ytPlayer.setPlaybackQualityRange === 'function') {
              ytPlayer.setPlaybackQualityRange(tier, tier);
            }
            break;
          }
        }
      }
    } catch (_) {}
  }, []);

  // Handle Playback End (Interception)
  const handleEndInterception = useCallback((ytPlayer: any) => {
    setIsEnded(true);
    setIsPlaying(false);
    engageCurtain(true);
    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
      try {
        ytPlayer.pauseVideo();
      } catch (_) {}
    }
    revealHud(true);
  }, [engageCurtain, revealHud]);

  // Clean Session Teardown
  const handleCloseSession = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

    engageCurtain(true);
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);

    if (player && typeof player.stopVideo === 'function') {
      try {
        player.stopVideo();
      } catch (_) {}
    }

    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    if (screen.orientation && typeof screen.orientation.unlock === 'function') {
      try {
        screen.orientation.unlock();
      } catch (_) {}
    }

    if (onClose) onClose();
  }, [player, engageCurtain, onClose]);

  // Play / Pause Toggle
  const togglePlayPause = useCallback(() => {
    if (!player || !playerReady) return;

    if (isEnded) {
      setIsEnded(false);
      engageCurtain(true);
      player.seekTo(0, true);
      player.playVideo();
      return;
    }

    if (isPlaying) {
      // SYNCHRONOUS INVARIANT: Paint curtain BEFORE pauseVideo()
      setIsPlaying(false);
      engageCurtain(true);
      revealHud(true);
      player.pauseVideo();
    } else {
      setIsBuffering(true);
      enforceMaxQuality(player);
      player.playVideo();
    }
  }, [player, playerReady, isEnded, isPlaying, engageCurtain, revealHud, enforceMaxQuality]);

  // Skip by delta seconds
  const skipSeconds = useCallback((delta: number) => {
    if (!player || !playerReady) return;
    const dur = duration || player.getDuration() || 0;
    const cur = player.getCurrentTime() || 0;
    const safeMax = dur > 0 ? Math.max(0, dur - 0.5) : cur + delta;
    const target = Math.max(0, Math.min(safeMax, cur + delta));

    if (isEnded && target < safeMax) {
      setIsEnded(false);
    }

    setCurrentTime(target);
    player.seekTo(target, true);

    setSkipFeedback({ side: delta < 0 ? 'left' : 'right', count: Math.abs(delta) });
    setTimeout(() => setSkipFeedback(null), 550);
    revealHud();
  }, [player, playerReady, duration, isEnded, revealHud]);

  // Volume Controller
  const handleVolumeChange = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newVol)));
    setVolume(clamped);
    setIsMuted(clamped === 0);

    if (player && playerReady) {
      try {
        if (clamped === 0) {
          player.mute();
        } else {
          player.unMute();
          player.setVolume(clamped);
        }
      } catch (_) {}
    }
  }, [player, playerReady]);

  const toggleMute = useCallback(() => {
    if (!player || !playerReady) return;
    if (isMuted) {
      setIsMuted(false);
      handleVolumeChange(volume > 0 ? volume : 80);
    } else {
      setIsMuted(true);
      try {
        player.mute();
      } catch (_) {}
    }
    revealHud();
  }, [player, playerReady, isMuted, volume, handleVolumeChange, revealHud]);

  // Speed Controller
  const cycleSpeed = useCallback(() => {
    const nextIdx = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(nextIdx);
    const rate = PLAYBACK_SPEEDS[nextIdx];
    if (player && playerReady && typeof player.setPlaybackRate === 'function') {
      try {
        player.setPlaybackRate(rate);
      } catch (_) {}
    }
    revealHud();
  }, [speedIndex, player, playerReady, revealHud]);

  // Cycle Mask
  const cycleMask = useCallback(() => {
    setMaskIndex((prev) => (prev + 1) % MASK_PRESETS.length);
    revealHud();
  }, [revealHud]);

  // 1. Resolve ticket & mount YouTube Player
  useEffect(() => {
    let isCancelled = false;

    async function initStream() {
      try {
        // Resolve ticket into isolated mount ID
        const res = await fetch(`/api/live-classes/${classId}/ticket`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticket }),
        });

        if (!res.ok) {
          throw new Error('Failed to authorize live class playback ticket');
        }

        const data = await res.json();
        if (isCancelled) return;
        const mountVideoId = data.mountId;

        // Ensure YouTube IFrame API script is in document
        const loadAPI = new Promise<void>((resolve) => {
          if (window.YT && window.YT.Player) {
            resolve();
            return;
          }
          const prevCallback = window.onYouTubeIframeAPIReady;
          window.onYouTubeIframeAPIReady = () => {
            if (prevCallback) prevCallback();
            resolve();
          };
          if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.async = true;
            document.head.appendChild(script);
          }
        });

        await loadAPI;
        if (isCancelled || !iframeHostRef.current) return;

        // Initialize YT.Player
        const ytPlayer = new window.YT.Player(iframeHostRef.current, {
          width: '100%',
          height: '100%',
          videoId: mountVideoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            cc_load_policy: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              if (isCancelled) return;
              setPlayer(event.target);
              setPlayerReady(true);

              // INVARIANT: Isolate iframe from pointer events and keyboard focus
              try {
                const iframe = event.target.getIframe();
                if (iframe) {
                  iframe.setAttribute('tabindex', '-1');
                  iframe.style.pointerEvents = 'none';
                  iframe.style.userSelect = 'none';
                }
              } catch (_) {}

              enforceMaxQuality(event.target);
              event.target.playVideo();
            },
            onStateChange: (event: any) => {
              if (isCancelled) return;
              const ytState = event.data;

              if (ytState === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                setIsBuffering(false);
                setIsEnded(false);
                enforceMaxQuality(event.target);

                // Wait 90ms for decoded video frame blit before hiding curtain
                setTimeout(() => {
                  if (!isCancelled) {
                    engageCurtain(false);
                  }
                }, 90);
                revealHud();
              } else if (ytState === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
                setIsBuffering(false);
                engageCurtain(true);
                revealHud(true);
              } else if (ytState === window.YT.PlayerState.BUFFERING) {
                setIsBuffering(true);
                enforceMaxQuality(event.target);
              } else if (ytState === window.YT.PlayerState.ENDED) {
                handleEndInterception(event.target);
              }
            },
            onError: () => {
              setError('Could not load live class video stream. Please try again.');
              engageCurtain(true);
            },
          },
        });
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Stream initialization error');
          engageCurtain(true);
        }
      }
    }

    initStream();

    return () => {
      isCancelled = true;
    };
  }, [classId, ticket, enforceMaxQuality, engageCurtain, handleEndInterception]);

  // 2. High-Frequency RAF + Interval Poller for Timeline & 60fps Pre-End Interception
  useEffect(() => {
    if (!player || !playerReady) return;

    const tick = () => {
      try {
        const cur = Number(player.getCurrentTime?.() || 0);
        const dur = Number(player.getDuration?.() || duration || 0);
        const buf = Number(player.getVideoLoadedFraction?.() || 0);

        if (dur > 0) {
          setDuration(dur);
          // 60FPS Pre-End Interception: 0.42s lead time blocks YouTube recommendation grid
          if (isPlaying && !isEnded && cur >= dur - 0.42) {
            handleEndInterception(player);
            return;
          }
        }

        if (!isScrubbingSeek) {
          setCurrentTime(cur);
          setBufferedPct(buf * 100);
        }
      } catch (_) {}

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    pollTimerRef.current = setInterval(tick, 80);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [player, playerReady, duration, isPlaying, isEnded, isScrubbingSeek, handleEndInterception]);

  // 3. Fullscreen Lifecycle Enforcement & Resize Observer
  useEffect(() => {
    computeGeometry();
    window.addEventListener('resize', computeGeometry);

    // Auto-enter native fullscreen on mount
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    }

    // Auto-close on fullscreen exit
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleCloseSession();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // Auto-close on tab switch / window minimize
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleCloseSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseSession();
      } else if (e.key === ' ' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'j') {
        e.preventDefault();
        skipSeconds(-10);
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'l') {
        e.preventDefault();
        skipSeconds(10);
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleVolumeChange(volume + 5);
        revealHud();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleVolumeChange(volume - 5);
        revealHud();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', computeGeometry);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [computeGeometry, handleCloseSession, togglePlayPause, skipSeconds, toggleMute, volume, handleVolumeChange, revealHud]);

  // 4. Interaction Shield Tap & Double-Tap Handler
  const handleShieldPointerUp = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / (rect.width || 1);
    const side = relX < 0.35 ? 'left' : relX > 0.65 ? 'right' : 'center';
    const now = performance.now();

    // Check for double-tap (< 280ms) on left or right side
    if (now - lastTapRef.current.time < 280 && lastTapRef.current.side === side && side !== 'center') {
      lastTapRef.current.time = 0;
      skipSeconds(side === 'left' ? -10 : 10);
      return;
    }

    lastTapRef.current = { time: now, side };

    if (e.pointerType === 'touch') {
      if (!showHud) {
        revealHud();
      } else {
        togglePlayPause();
      }
    } else {
      togglePlayPause();
    }
  };

  // 5. Unified Pointer Scrubber for Seek Bar
  const handleSeekPointerDown = (e: React.PointerEvent) => {
    if (!seekSliderRef.current || duration <= 0) return;
    e.stopPropagation();
    setIsScrubbingSeek(true);
    seekSliderRef.current.setPointerCapture(e.pointerId);
    revealHud(true);

    const rect = seekSliderRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setCurrentTime(frac * duration);
  };

  const handleSeekPointerMove = (e: React.PointerEvent) => {
    if (!seekSliderRef.current || duration <= 0) return;
    const rect = seekSliderRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverSeekTime(frac * duration);
    setHoverSeekPos(frac * 100);

    if (isScrubbingSeek) {
      e.stopPropagation();
      setCurrentTime(frac * duration);
    }
  };

  const handleSeekPointerUp = (e: React.PointerEvent) => {
    if (!isScrubbingSeek || !seekSliderRef.current || duration <= 0) return;
    e.stopPropagation();
    setIsScrubbingSeek(false);
    try {
      seekSliderRef.current.releasePointerCapture(e.pointerId);
    } catch (_) {}

    const rect = seekSliderRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = Math.min(Math.max(0, duration - 0.5), frac * duration);

    if (player && playerReady) {
      player.seekTo(target, true);
    }
    revealHud();
  };

  // 6. Unified Pointer Scrubber for Volume
  const handleVolumePointerDown = (e: React.PointerEvent) => {
    if (!volumeSliderRef.current) return;
    e.stopPropagation();
    setIsScrubbingVolume(true);
    volumeSliderRef.current.setPointerCapture(e.pointerId);
    revealHud(true);

    const rect = volumeSliderRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    handleVolumeChange(frac * 100);
  };

  const handleVolumePointerMove = (e: React.PointerEvent) => {
    if (!isScrubbingVolume || !volumeSliderRef.current) return;
    e.stopPropagation();
    const rect = volumeSliderRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    handleVolumeChange(frac * 100);
  };

  const handleVolumePointerUp = (e: React.PointerEvent) => {
    if (!isScrubbingVolume || !volumeSliderRef.current) return;
    e.stopPropagation();
    setIsScrubbingVolume(false);
    try {
      volumeSliderRef.current.releasePointerCapture(e.pointerId);
    } catch (_) {}
    revealHud();
  };

  const currentPreset = MASK_PRESETS[maskIndex];
  const seekPct = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-screen h-[100dvh] z-50 bg-black flex flex-col justify-between overflow-hidden select-none touch-none"
      onContextMenu={(e) => e.preventDefault()}
      onPointerMove={() => revealHud()}
      style={{ cursor: showHud ? 'default' : 'none' }}
    >
      {/* ── LAYER 1: LOCKED YOUTUBE EMBED LAYER (1.20x Overscan & Pointer-Events None) ── */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-black flex items-center justify-center pointer-events-none select-none">
        <div
          ref={overscanBoxRef}
          className="relative pointer-events-none select-none flex items-center justify-center"
          style={{ width: '100vw', height: '100dvh', transform: 'scale(1.20)' }}
        >
          <div ref={iframeHostRef} className="w-full h-full pointer-events-none select-none" />
        </div>
      </div>

      {/* ── LAYER 2: RAZOR-SHARP SOLID #000000 OCCLUSION BARS (Strictly Zero Gradients) ── */}
      <div
        className="absolute top-0 inset-x-0 z-10 pointer-events-none bg-black border-b border-[#16161a]"
        style={{ height: `max(${currentPreset.vhTop}dvh, ${currentPreset.minTopPx}px)` }}
      />
      <div
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none bg-black border-t border-[#16161a]"
        style={{ height: `max(${currentPreset.vhBottom}dvh, ${currentPreset.minBottomPx}px)` }}
      />

      {/* ── LAYER 3: SYNCHRONOUS SOLID #000000 CURTAIN (Pause, Buffering, End) ── */}
      <div
        ref={opaqueCurtainRef}
        className="absolute inset-0 z-15 bg-black pointer-events-none transition-opacity duration-100 opacity-100 flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-[#05070B]" />
      </div>

      {/* ── LAYER 4: FULL-BLEED INTERACTION SHIELD (Traps Clicks & Gestures) ── */}
      <div
        className="absolute inset-0 z-20 cursor-pointer"
        onPointerUp={handleShieldPointerUp}
      >
        {/* Double-tap feedback badges */}
        {skipFeedback && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 pointer-events-none px-4 py-2 rounded-xl bg-black/60 border border-white/20 backdrop-blur-md text-white font-mono text-xs font-semibold flex items-center gap-1.5 shadow-2xl transition-all ${
              skipFeedback.side === 'left' ? 'left-8 sm:left-16' : 'right-8 sm:right-16'
            }`}
          >
            {skipFeedback.side === 'left' ? <ChevronLeft size={16} /> : null}
            <span>{skipFeedback.side === 'left' ? '-10s' : '+10s'}</span>
            {skipFeedback.side === 'right' ? <ChevronRight size={16} /> : null}
          </div>
        )}
      </div>

      {/* ── LAYER 5: CENTER GLYPH / STATUS (Lernio Glassmorphism Style) ── */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none transition-opacity duration-200 ${
          showHud || !isPlaying || isBuffering ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {isBuffering && (
          <div className="flex flex-col items-center gap-2.5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/50 border border-white/15 backdrop-blur-md flex items-center justify-center text-white shadow-2xl">
              <Loader2 size={32} className="animate-spin text-blue-400" />
            </div>
            <span className="text-[11px] font-mono tracking-wider uppercase text-blue-200 px-3 py-1 rounded-full bg-black/60 border border-white/10">
              Buffering HD Stream
            </span>
          </div>
        )}

        {!isBuffering && !isPlaying && !isEnded && (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/50 border border-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-2xl transition-transform hover:scale-105">
            <Play size={32} className="ml-1 fill-white" />
          </div>
        )}

        {isEnded && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600 border border-blue-400 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-105">
              <RotateCcw size={28} />
            </div>
            <span className="text-[11px] font-semibold text-white px-3 py-1 rounded-full bg-black/60 border border-white/15">
              Replay Stream
            </span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-black/80 border border-red-500/40 text-center max-w-sm">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-xs text-red-200">{error}</p>
          </div>
        )}
      </div>

      {/* ── LAYER 6: TOP HUD BAR (Nested inside Top Black Occlusion Bar) ── */}
      <div
        className={`relative z-30 px-4 sm:px-6 pt-3 flex items-center justify-between gap-3 transition-opacity duration-200 ${
          showHud ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 max-w-[65vw]">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 animate-pulse" />
          <h2 className="text-xs sm:text-sm font-semibold text-white truncate drop-shadow-xs">
            {title}
          </h2>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <Sparkles size={11} />
            <span>MAX HD</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Cycle Aspect Mask */}
          <button
            type="button"
            onClick={cycleMask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 border border-white/15 text-white text-xs font-mono transition-colors cursor-pointer"
            title="Cycle Cinema Mask Aspect Ratio"
          >
            <Crop size={14} />
            <span className="hidden md:inline">{currentPreset.label}</span>
          </button>

          {/* Minimize / Exit */}
          <button
            type="button"
            onClick={handleCloseSession}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 active:bg-red-500/40 border border-red-500/30 text-red-200 text-xs font-semibold transition-colors cursor-pointer"
            title="Exit Fullscreen Player"
          >
            <Minimize2 size={14} />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* ── LAYER 7: BOTTOM HUD CONTROL DECK (Lernio CustomPlayer Style) ── */}
      <div
        className={`relative z-30 px-3 sm:px-6 pb-3 sm:pb-4 transition-opacity duration-200 ${
          showHud ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-5xl mx-auto rounded-2xl bg-black/75 border border-white/15 backdrop-blur-xl px-4 py-2.5 shadow-2xl">
          {/* Seek Progress Timeline */}
          <div
            ref={seekSliderRef}
            className="group relative h-7 flex items-center cursor-pointer select-none touch-none"
            onPointerDown={handleSeekPointerDown}
            onPointerMove={handleSeekPointerMove}
            onPointerUp={handleSeekPointerUp}
            onPointerCancel={handleSeekPointerUp}
            onPointerLeave={() => setHoverSeekTime(null)}
          >
            {/* Hover tooltip */}
            {hoverSeekTime !== null && (
              <div
                className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/90 border border-white/20 text-[11px] font-mono text-white pointer-events-none tabular-nums"
                style={{ left: `${hoverSeekPos}%` }}
              >
                {formatTimecode(hoverSeekTime)}
              </div>
            )}

            {/* Track Bar */}
            <div className="w-full h-1.5 group-hover:h-2 transition-all bg-white/20 rounded-full overflow-hidden relative">
              <div
                className="absolute inset-y-0 left-0 bg-white/30"
                style={{ width: `${bufferedPct}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-blue-500"
                style={{ width: `${seekPct}%` }}
              />
            </div>

            {/* Scrubber Knob */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md border border-black/40 pointer-events-none group-hover:scale-125 transition-transform"
              style={{ left: `${seekPct}%` }}
            />
          </div>

          {/* Transport Row */}
          <div className="mt-1 flex items-center justify-between gap-2">
            {/* Left Transport */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={togglePlayPause}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Play / Pause (Space)"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5 fill-current" />}
              </button>

              <button
                type="button"
                onClick={() => skipSeconds(-10)}
                className="px-2.5 h-9 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 text-white text-xs font-mono flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Rewind 10 Seconds"
              >
                <ChevronLeft size={14} />
                <span>-10s</span>
              </button>

              <button
                type="button"
                onClick={() => skipSeconds(10)}
                className="px-2.5 h-9 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 text-white text-xs font-mono flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Forward 10 Seconds"
              >
                <span>+10s</span>
                <ChevronRight size={14} />
              </button>

              <div className="px-2.5 h-9 sm:h-10 rounded-xl bg-black/40 border border-white/10 flex items-center gap-1 text-xs font-mono tabular-nums text-white/80">
                <span className="text-white font-medium">{formatTimecode(currentTime)}</span>
                <span className="text-white/40">/</span>
                <span>{formatTimecode(duration)}</span>
              </div>
            </div>

            {/* Right Transport: Volume, Speed, Fullscreen */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Volume Slider */}
              <div className="flex items-center gap-1.5 px-2.5 h-9 sm:h-10 rounded-xl bg-white/10 border border-white/10">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Mute / Unmute"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={17} className="text-red-400" />
                  ) : volume < 50 ? (
                    <Volume1 size={17} />
                  ) : (
                    <Volume2 size={17} />
                  )}
                </button>

                <div
                  ref={volumeSliderRef}
                  className="relative w-14 sm:w-20 h-6 flex items-center cursor-pointer touch-none"
                  onPointerDown={handleVolumePointerDown}
                  onPointerMove={handleVolumePointerMove}
                  onPointerUp={handleVolumePointerUp}
                  onPointerCancel={handleVolumePointerUp}
                >
                  <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-white"
                      style={{ width: `${isMuted ? 0 : volume}%` }}
                    />
                  </div>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-xs pointer-events-none"
                    style={{ left: `${isMuted ? 0 : volume}%` }}
                  />
                </div>
              </div>

              {/* Speed Button */}
              <button
                type="button"
                onClick={cycleSpeed}
                className="px-2.5 h-9 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 text-white text-xs font-mono font-semibold transition-colors cursor-pointer"
                title="Playback Speed"
              >
                {PLAYBACK_SPEEDS[speedIndex]}x
              </button>

              {/* Close / Minimize */}
              <button
                type="button"
                onClick={handleCloseSession}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 flex items-center justify-center transition-colors cursor-pointer"
                title="Exit Fullscreen & Close (Esc)"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
