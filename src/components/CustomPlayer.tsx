'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Loader2 } from 'lucide-react';

interface CustomPlayerProps {
  srcUrl: string; // This is the presigned R2 url
}

export default function CustomPlayer({ srcUrl }: CustomPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // 1. Obfuscate the true video source URL using Blob URL
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    // Fetch the presigned URL as a blob
    fetch(srcUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch video stream.');
        return res.blob();
      })
      .then((blob) => {
        if (!active) return;
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error creating video blob:', err);
        if (active) {
          setError('Could not load video player. Security checks failed.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [srcUrl]);

  // 2. Clear state on source change
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
  }, [srcUrl]);

  // Video Controls Logic
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    if (duration > 0) {
      setProgress((current / duration) * 100);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = (Number(e.target.value) / 100) * videoRef.current.duration;
    videoRef.current.currentTime = time;
    setProgress(Number(e.target.value));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const newVolume = Number(e.target.value);
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const muteState = !isMuted;
    videoRef.current.muted = muteState;
    setIsMuted(muteState);
  };

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullScreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullScreen(false)).catch(() => {});
    }
  };

  // Keyboard controls & casual DRM (Prevent copy / Printscreen / Save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space for play/pause
      if (e.code === 'Space' && document.activeElement === document.body) {
        e.preventDefault();
        togglePlay();
      }
      // F for fullscreen
      if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullScreen();
      }
      // Block Ctrl+S (Save page)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()} // Disable Right Click
      className="relative flex items-center justify-center w-full aspect-video bg-black rounded-radius-md overflow-hidden border border-[#141a20]"
    >
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90">
          <Loader2 size={36} className="animate-spin text-surface-raised mb-space-2" />
          <p className="text-xs text-text-terxl font-medium text-text-tertiary">Decrypting Stream...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black">
          <p className="text-xs text-red-500 font-semibold">{error}</p>
        </div>
      )}

      {blobUrl && (
        <>
          <video
            ref={videoRef}
            src={blobUrl}
            onTimeUpdate={handleTimeUpdate}
            onClick={togglePlay}
            controlsList="nodownload" // Hide native download button
            disablePictureInPicture
            className="w-full h-full object-contain pointer-events-auto"
            aria-label="Video Player"
          />

          {/* Custom Overlay Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-space-2 bg-gradient-to-t from-black/80 to-transparent flex flex-col space-y-2 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-instant">
            {/* Seek Bar */}
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleSeek}
              className="w-full h-1 bg-surface-strong accent-surface-raised rounded-radius-xs cursor-pointer focus:outline-none"
              aria-label="Seek track"
            />

            <div className="flex justify-between items-center text-white">
              <div className="flex items-center space-x-space-3">
                <button
                  onClick={togglePlay}
                  className="hover:text-surface-raised focus:outline-none"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={toggleMute}
                    className="hover:text-surface-raised focus:outline-none"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-surface-strong accent-surface-raised rounded cursor-pointer"
                    aria-label="Volume adjustment"
                  />
                </div>
              </div>

              <button
                onClick={toggleFullScreen}
                className="hover:text-surface-raised focus:outline-none"
                aria-label="Toggle full screen"
              >
                <Maximize2 size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
