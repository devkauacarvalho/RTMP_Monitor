/**
 * pages/viewer/CameraDetail.jsx
 *
 * Tela de visualização detalhada de câmera individual:
 * - Player maximizado de alta resolução
 * - Suporte a tela cheia / rotação para paisagem
 * - Controle de áudio (AAC)
 * - Navegação rápida para outras câmeras autorizadas
 */
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import HlsPlayer from '../../components/player/HlsPlayer';

export default function CameraDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [camera, setCamera] = useState(null);
  const [allMyCameras, setAllMyCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(true);
  const playerContainerRef = useRef(null);

  const loadCamera = async () => {
    try {
      setLoading(true);
      setError('');

      const [camRes, listRes] = await Promise.all([
        api.get(`/cameras/my/${id}`),
        api.get('/cameras/my'),
      ]);

      setCamera(camRes.data);
      setAllMyCameras(listRes.data);
    } catch (err) {
      console.error('Erro ao carregar detalhes da câmera:', err);
      setError(err.response?.data?.error || 'Não foi possível carregar a transmissão desta câmera.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCamera();
  }, [id]);

  const currentIndex = allMyCameras.findIndex((c) => c.id === id);
  const prevCam = currentIndex > 0 ? allMyCameras[currentIndex - 1] : null;
  const nextCam = currentIndex !== -1 && currentIndex < allMyCameras.length - 1 ? allMyCameras[currentIndex + 1] : null;

  const handleFullscreen = () => {
    const el = playerContainerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
      // Try locking orientation to landscape on mobile if supported
      if (window.screen?.orientation?.lock) {
        window.screen.orientation.lock('landscape').catch(() => {});
      }
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto fade-in">
        <div className="h-6 w-32 bg-slate-800 rounded animate-pulse"></div>
        <div className="aspect-video bg-slate-900 rounded-2xl border border-slate-800 animate-pulse"></div>
      </div>
    );
  }

  if (error || !camera) {
    return (
      <div className="max-w-xl mx-auto p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 fade-in">
        <div className="w-12 h-12 mx-auto rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2 className="text-base font-bold text-white">Câmera Indisponível</h2>
        <p className="text-xs text-slate-400">{error || 'Canal não encontrado ou permissão revogada.'}</p>
        <Link
          to="/viewer"
          className="inline-block px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors"
        >
          &larr; Voltar para Todas as Câmeras
        </Link>
      </div>
    );
  }

  const isLive = camera.status === 'streaming';

  return (
    <div className="max-w-4xl mx-auto space-y-4 fade-in pb-12">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/viewer')}
          className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Voltar
        </button>

        {/* Previous / Next Camera Controls */}
        <div className="flex items-center gap-2">
          {prevCam && (
            <button
              onClick={() => navigate(`/viewer/camera/${prevCam.id}`)}
              className="p-1.5 px-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
              title={`Câmera anterior: ${prevCam.name}`}
            >
              &larr; CH {prevCam.channel_number}
            </button>
          )}

          {nextCam && (
            <button
              onClick={() => navigate(`/viewer/camera/${nextCam.id}`)}
              className="p-1.5 px-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
              title={`Próxima câmera: ${nextCam.name}`}
            >
              CH {nextCam.channel_number} &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Main Player Display */}
      <div
        ref={playerContainerRef}
        className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-2xl aspect-video"
      >
        <HlsPlayer
          src={camera.hls_url}
          cameraName={camera.name}
          channelNumber={camera.channel_number}
          isLive={isLive}
          muted={muted}
          onFullscreen={handleFullscreen}
          className="w-full h-full"
        />
      </div>

      {/* Live Controls & Info Toolbar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                CANAL {camera.channel_number}
              </span>
              <h1 className="text-base sm:text-lg font-bold text-white">{camera.name}</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <span className="text-slate-300 font-medium">{camera.client_name}</span>
              <span className="text-slate-600">&bull;</span>
              <span>Gravador: {camera.dvr_name || 'DVR Principal'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setMuted(!muted)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 ${
                !muted
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                {muted ? (
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                ) : (
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                )}
              </svg>
              {muted ? 'Ativar Áudio' : 'Mutar'}
            </button>

            {/* Fullscreen Trigger */}
            <button
              type="button"
              onClick={handleFullscreen}
              className="px-3 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
              Tela Cheia
            </button>
          </div>
        </div>

        {/* Technical specs strip */}
        <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-slate-500 block text-[10px] uppercase">Protocolo</span>
            <span className="text-slate-200 font-semibold">LL-HLS</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-slate-500 block text-[10px] uppercase">Codec Vídeo</span>
            <span className="text-slate-200 font-semibold">H.264 / AVC</span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-slate-500 block text-[10px] uppercase">Status</span>
            <span className={isLive ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
              {isLive ? 'Transmitindo' : 'Standby'}
            </span>
          </div>
          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-slate-500 block text-[10px] uppercase">Latência</span>
            <span className="text-cyan-400 font-semibold">&lt; 1.5s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
