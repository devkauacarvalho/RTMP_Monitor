/**
 * components/player/HlsPlayer.jsx
 *
 * Player de vídeo LL-HLS para CFTV usando hls.js com fallback nativo.
 * Inclui overlay de monitoramento em tempo real (REC, Timestamp, Nome, Status de Sinal).
 */
import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import './HlsPlayer.css';

export default function HlsPlayer({
  src,
  cameraName = 'CÂMERA AO VIVO',
  channelNumber = 1,
  autoPlay = true,
  muted = true,
  className = '',
  showControls = true,
  onFullscreen,
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Clock ticker for CCTV timestamp
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString('pt-BR', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const initHls = () => {
    const video = videoRef.current;
    if (!video || !src) return;

    setHasError(false);
    setIsPlaying(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        enableWorker: true,
        manifestLoadingMaxRetry: 3,
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) {
          video.play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setHasError(true);
          setIsPlaying(false);
          hls.destroy();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      if (autoPlay) {
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => setHasError(true));
      }
    } else {
      setHasError(true);
    }
  };

  useEffect(() => {
    initHls();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  const toggleFullscreen = () => {
    if (onFullscreen) {
      onFullscreen();
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div ref={containerRef} className={`cftv-player-wrapper ${className}`}>
      <video
        ref={videoRef}
        className="hls-player-video"
        muted={muted}
        playsInline
        autoPlay={autoPlay}
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        aria-label={`Stream da câmera ${cameraName}`}
      />

      {/* CCTV Screen HUD Overlay */}
      <div className="cftv-overlay">
        {/* Top Header Row */}
        <div className="cftv-overlay-top">
          <div className="cftv-tag">
            <span className="cftv-rec-dot"></span>
            <span className="cftv-rec-text">AO VIVO</span>
            <span className="cftv-ch-badge">CH {String(channelNumber).padStart(2, '0')}</span>
          </div>

          <div className="cftv-clock tabular-nums">
            {currentTimeStr}
          </div>
        </div>

        {/* Standby / Signal Search Overlay if offline or awaiting DVR connection */}
        {(!isPlaying || hasError) && (
          <div className="cftv-standby-screen">
            <div className="cftv-crosshair"></div>
            <div className="cftv-signal-box">
              <div className="cftv-scanline"></div>
              <svg className="cftv-cam-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 6h12a2 2 0 0 1 2 2v2.5l4-2.5v8l-4-2.5V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>
              </svg>
              <span className="cftv-status-title">AGUARDANDO SINAL RTMP</span>
              <span className="cftv-status-desc">Transmissão em espera ou MediaMTX offline</span>
              <button
                type="button"
                onClick={initHls}
                className="cftv-retry-btn"
                title="Tentar reconectar stream"
              >
                Reconectar
              </button>
            </div>
          </div>
        )}

        {/* Bottom Bar Row */}
        <div className="cftv-overlay-bottom">
          <span className="cftv-camera-title">{cameraName}</span>

          {showControls && (
            <div className="cftv-controls-group">
              <button
                type="button"
                onClick={initHls}
                className="cftv-icon-btn"
                title="Atualizar stream"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6M1 20v-6h6"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="cftv-icon-btn"
                title="Tela cheia"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
