/**
 * pages/viewer/ViewerHome.jsx
 *
 * Visão do Usuário Visualizador (Mobile-First)
 * Grid de 2 colunas com cards compactos de câmeras ao vivo, status,
 * atalho para tela cheia e toque para abrir detalhe.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import HlsPlayer from '../../components/player/HlsPlayer';
import { useAuthStore } from '../../store/auth.store';

export default function ViewerHome() {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const fetchMyCameras = async () => {
    try {
      const res = await api.get('/cameras/my');
      setCameras(res.data);
    } catch (err) {
      console.error('Erro ao carregar câmeras autorizadas:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyCameras();
    // Auto-refresh camera status every 15 seconds
    const interval = setInterval(fetchMyCameras, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchMyCameras();
  };

  const handleOpenDetail = (camId) => {
    navigate(`/viewer/camera/${camId}`);
  };

  return (
    <div className="space-y-4 fade-in pb-12">
      {/* Top Welcome & Bar */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
            Monitoramento Ao Vivo
          </span>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Olá, {user?.full_name?.split(' ')[0] || user?.username}
          </h1>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-sm"
          title="Atualizar lista de câmeras"
        >
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={refreshing ? 'animate-spin text-blue-400' : ''}
          >
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {/* Cameras Grid (Mobile-first 2 colunas) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-video bg-slate-900 rounded-2xl border border-slate-800 animate-pulse"></div>
          ))}
        </div>
      ) : cameras.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M4 6h12a2 2 0 0 1 2 2v2.5l4-2.5v8l-4-2.5V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>
            </svg>
          </div>
          <h2 className="text-base font-bold text-white">Nenhuma câmera disponível</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Seu usuário ainda não possui canais de CFTV autorizados ou as transmissões dos gravadores estão desconectadas.
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            Solicite ao técnico responsável a liberação do acesso às suas câmeras.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {cameras.map((cam) => {
            const isLive = cam.status === 'streaming';
            return (
              <div
                key={cam.id}
                className="group relative rounded-2xl bg-slate-900 border border-slate-800/80 overflow-hidden shadow-sm hover:border-slate-700 transition-all flex flex-col"
              >
                {/* Header card with name & live status badge */}
                <div className="p-3 bg-slate-950/80 border-b border-slate-800/60 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs sm:text-sm text-white truncate">
                      {cam.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-slate-300">CH {cam.channel_number}</span>
                      <span className="text-slate-600">&bull;</span>
                      <span className="truncate">{cam.client_name || cam.dvr_name}</span>
                    </p>
                  </div>

                  {/* Status Badge (Verde se live, Vermelho/Cinza se standby) */}
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full border flex items-center gap-1 shrink-0 ${
                      isLive
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                    {isLive ? 'AO VIVO' : 'STANDBY'}
                  </span>
                </div>

                {/* Player container */}
                <div className="relative aspect-video bg-black overflow-hidden cursor-pointer" onClick={() => handleOpenDetail(cam.id)}>
                  <HlsPlayer
                    src={cam.hls_url}
                    cameraName={cam.name}
                    channelNumber={cam.channel_number}
                    isLive={isLive}
                    showControls={false}
                    className="w-full h-full"
                  />

                  {/* Quick Expand Button Hover/Touch */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDetail(cam.id);
                    }}
                    className="absolute bottom-2.5 right-2.5 z-20 px-2.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 text-white text-[11px] font-medium backdrop-blur-sm transition-all flex items-center gap-1.5 shadow-lg"
                    title="Expandir câmera"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 3 21 3 21 9"/>
                      <polyline points="9 21 3 21 3 15"/>
                      <line x1="21" y1="3" x2="14" y2="10"/>
                      <line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                    <span>Expandir</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
