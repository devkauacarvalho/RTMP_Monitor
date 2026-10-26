/**
 * pages/tech/TechDashboard.jsx
 * Dashboard Principal do Técnico com Status Global do Sistema CFTV
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import HlsPlayer from '../../components/player/HlsPlayer';

export default function TechDashboard() {
  const [stats, setStats] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsRes, camerasRes] = await Promise.all([
        api.get('/settings/stats'),
        api.get('/cameras'),
      ]);
      setStats(statsRes.data);
      setCameras(camerasRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setError('Não foi possível carregar os dados em tempo real.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const copyRtmpUrl = (cam) => {
    if (!cam.rtmp_push_url) return;
    navigator.clipboard.writeText(cam.rtmp_push_url);
    setCopiedId(cam.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleStreamSimulation = async (cam) => {
    try {
      const nextStatus = cam.status === 'streaming' ? 'active' : 'streaming';
      await api.put(`/cameras/${cam.id}`, { status: nextStatus });
      fetchDashboardData();
    } catch (err) {
      console.error('Erro ao alternar status da câmera:', err);
    }
  };

  if (loading && !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-900 rounded-lg w-1/4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-900 rounded-2xl border border-slate-800"></div>
          ))}
        </div>
      </div>
    );
  }

  const streamingCams = cameras.filter((c) => c.status === 'streaming');

  return (
    <div className="space-y-8 fade-in">
      {/* Top Header with title & refresh button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Painel de Monitoramento
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Status geral da infraestrutura de vídeo RTMP e conexões dos gravadores.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="self-start sm:self-auto px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors flex items-center gap-2"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={loading ? 'animate-spin' : ''}
          >
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Atualizar Dados
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* KPI Stat Cards (4 columns on desktop, 2 on mobile) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total de Clientes</span>
            <span className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10z"/>
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
              {stats?.total_clients ?? 0}
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">
              {stats?.active_clients ?? 0} ativos
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Equipamentos DVR</span>
            <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-1 14H5c-.55 0-1-.45-1-1s.45-1 1-1h14c.55 0 1 .45 1 1s-.45 1-1 1zm1-4H4V8h16v6z"/>
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
              {stats?.total_dvrs ?? 0}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">cadastrados</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Câmeras / Canais</span>
            <span className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M4 6h12a2 2 0 0 1 2 2v2.5l4-2.5v8l-4-2.5V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/>
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
              {stats?.total_cameras ?? 0}
            </span>
            <span className="text-[11px] text-emerald-400 font-semibold font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {stats?.streaming_cameras ?? 0} ao vivo
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Visualizadores</span>
            <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
              {stats?.total_viewers ?? 0}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">usuários finais</span>
          </div>
        </div>
      </div>

      {/* Quick Action Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Link
          to="/tech/clients"
          className="px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors whitespace-nowrap shadow-sm flex items-center gap-1.5"
        >
          + Cadastrar Cliente
        </Link>
        <Link
          to="/tech/dvr"
          className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5"
        >
          + Cadastrar DVR
        </Link>
        <Link
          to="/tech/cameras"
          className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5"
        >
          + Novo Canal / Câmera
        </Link>
        <Link
          to="/tech/users"
          className="px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5"
        >
          + Cadastrar Visualizador
        </Link>
      </div>

      {/* Architecture Explainer Card (Indivíduo 1 -> 2 -> 3) */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-900/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <span className="text-[11px] font-mono uppercase text-blue-400 font-semibold tracking-wider">
              Arquitetura de Fluxo RTMP sem Abertura de Portas
            </span>
            <h2 className="text-base font-bold text-white">
              Push Seguro: Transmissor DVR ➔ MediaMTX VPS ➔ Visualizador Web
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              O DVR físico inicia uma conexão de saída (Push RTMP) usando o token único do canal. O servidor MediaMTX converte em tempo real para LL-HLS para o visualizador sem que nenhuma porta precise ser aberta no roteador do cliente.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto text-xs font-mono bg-slate-950/70 px-3 py-2 rounded-xl border border-slate-800">
            <span className="text-slate-400">Servidor:</span>
            <span className="text-emerald-400 font-semibold">{stats?.server_settings?.mediamtx_host || 'localhost'}:{stats?.server_settings?.rtmp_port || 1935}</span>
          </div>
        </div>
      </div>

      {/* Live Transmitting Cameras Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Câmeras Transmitindo ao Vivo ({streamingCams.length})
            </h2>
          </div>
          <Link to="/tech/cameras" className="text-xs text-blue-400 hover:underline">
            Ver todas as {cameras.length} câmeras &rarr;
          </Link>
        </div>

        {streamingCams.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/50 border border-slate-800/80">
            <p className="text-sm text-slate-400">Nenhuma câmera transmitindo ativamente no momento.</p>
            <p className="text-xs text-slate-500 mt-1">
              Configure as URLs RTMP nos DVRs físicos ou ative a simulação de stream na tela de Câmeras.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {streamingCams.map((cam) => (
              <div
                key={cam.id}
                className="rounded-2xl bg-slate-900 border border-slate-800/80 overflow-hidden shadow-sm flex flex-col"
              >
                <div className="relative">
                  <HlsPlayer
                    src={cam.hls_playback_url}
                    cameraName={cam.name}
                    channelNumber={cam.channel_number}
                  />
                </div>

                <div className="p-3.5 flex flex-col gap-2 flex-1 justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 truncate">{cam.name}</span>
                      <span className="text-slate-400 font-mono text-[11px]">Canal {cam.channel_number}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                      {cam.client_name} &bull; {cam.dvr_name}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => copyRtmpUrl(cam)}
                      className="px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-md transition-colors flex items-center gap-1 truncate"
                      title="Copiar URL RTMP de envio para configurar no DVR"
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      {copiedId === cam.id ? 'Copiado!' : 'URL RTMP'}
                    </button>

                    <button
                      onClick={() => toggleStreamSimulation(cam)}
                      className="px-2 py-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-md transition-colors"
                      title="Simular pausa de sinal"
                    >
                      Pausar Stream
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Registered Cameras Quick Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white">
            Grade de Câmeras Cadastradas
          </h2>
          <Link
            to="/tech/cameras"
            className="text-xs font-medium text-blue-400 hover:text-blue-300"
          >
            Gerenciar Câmeras
          </Link>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 font-medium uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Canal</th>
                <th className="py-3 px-4">Câmera</th>
                <th className="py-3 px-4">Cliente / DVR</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {cameras.map((cam) => (
                <tr key={cam.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-300">
                    CH {String(cam.channel_number).padStart(2, '0')}
                  </td>
                  <td className="py-3 px-4 font-semibold text-white">
                    {cam.name}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    <div>{cam.client_name}</div>
                    <div className="text-[10px] text-slate-500">{cam.dvr_name}</div>
                  </td>
                  <td className="py-3 px-4">
                    {cam.status === 'streaming' ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Transmitindo
                      </span>
                    ) : cam.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Pronta
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                        Inativa
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => copyRtmpUrl(cam)}
                      className="px-2 py-1 text-[11px] font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                      title="Copiar URL RTMP"
                    >
                      {copiedId === cam.id ? 'Copiado!' : 'RTMP'}
                    </button>
                    <button
                      onClick={() => toggleStreamSimulation(cam)}
                      className="px-2 py-1 text-[11px] text-blue-400 hover:text-blue-300 bg-blue-950/40 hover:bg-blue-900/40 rounded transition-colors"
                    >
                      {cam.status === 'streaming' ? 'Pausar' : 'Simular'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
