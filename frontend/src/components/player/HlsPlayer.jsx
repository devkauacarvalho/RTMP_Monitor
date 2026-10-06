/**
 * components/player/HlsPlayer.jsx
 *
 * Player de vídeo LL-HLS usando hls.js com fallback nativo.
 * Suporta rotação de tela (landscape) para visualização em detalhe.
 */
import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import './HlsPlayer.css';

export default function HlsPlayer({ src, autoPlay = true, muted = true, className = '' }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,       // LL-HLS
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        enableWorker: true,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('[HLS] Fatal error:', data.type, data.details);
          hls.destroy();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari — suporte nativo HLS
      video.src = src;
      if (autoPlay) video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay]);

  return (
    <video
      ref={videoRef}
      className={`hls-player ${className}`}
      muted={muted}
      playsInline
      controls
      aria-label="Player de câmera"
    />
  );
}
