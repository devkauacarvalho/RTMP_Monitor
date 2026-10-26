/**
 * pages/tech/CamerasPage.jsx
 * Gerenciamento de Câmeras/Canais RTMP & LL-HLS
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import HlsPlayer from '../../components/player/HlsPlayer';

export default function CamerasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDvrId = searchParams.get('dvr_id') || '';

  const [cameras, setCameras] = useState([]);
  const [dvrs, setDvrs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State for Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [formData, setFormData] = useState({
    dvr_device_id: '',
    channel_number: 1,
    name: '',
    status: 'active',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState(null);
  const [copiedType, setCopiedType] = useState(null);

  // Guide modal state
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Live test preview player modal
  const [previewCam, setPreviewCam] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [camRes, dvrRes, clientRes] = await Promise.all([
        api.get('/cameras', { params: selectedDvrId ? { dvr_device_id: selectedDvrId } : {} }),
        api.get('/dvr'),
        api.get('/clients'),
      ]);
      setCameras(camRes.data);
      setDvrs(dvrRes.data);
      setClients(clientRes.data);
    } catch (err) {
      console.error('Erro ao carregar câmeras:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDvrId]);

  const handleDvrFilterChange = (dvrId) => {
    if (dvrId) {
      setSearchParams({ dvr_id: dvrId });
    } else {
      setSearchParams({});
    }
  };

  const copyToClipboard = (text, id, type) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setCopiedType(type);
    setTimeout(() => {
      setCopiedId(null);
      setCopiedType(null);
    }, 2000);
  };

  const openCreateModal = () => {
    setEditingCamera(null);
    setFormData({
      dvr_device_id: selectedDvrId || (dvrs[0]?.id || ''),
      channel_number: 1,
      name: '',
      status: 'active',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (cam) => {
    setEditingCamera(cam);
    setFormData({
      dvr_device_id: cam.dvr_device_id,
      channel_number: cam.channel_number,
      name: cam.name,
      status: cam.status,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('O nome da câmera é obrigatório.');
      return;
    }
    if (!formData.dvr_device_id) {
      setFormError('Selecione um gravador DVR.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      if (editingCamera) {
        await api.put(`/cameras/${editingCamera.id}`, {
          name: formData.name,
          channel_number: parseInt(formData.channel_number, 10),
          status: formData.status,
        });
      } else {
        await api.post('/cameras', {
          dvr_device_id: formData.dvr_device_id,
          channel_number: parseInt(formData.channel_number, 10),
          name: formData.name,
        });
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao salvar câmera.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cam) => {
    if (!window.confirm(`Deseja remover a câmera "${cam.name}" (Canal ${cam.channel_number})? As permissões vinculadas também serão removidas.`)) {
      return;
    }

    try {
      await api.delete(`/cameras/${cam.id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao remover câmera.');
    }
  };

  const toggleStreamSimulation = async (cam) => {
    const nextStatus = cam.status === 'streaming' ? 'active' : 'streaming';
    try {
      await api.put(`/cameras/${cam.id}`, { status: nextStatus });
      loadData();
    } catch (err) {
      alert('Erro ao alternar status do stream.');
    }
  };

  const filteredCameras = cameras.filter((cam) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      cam.name.toLowerCase().includes(term) ||
      (cam.dvr_name && cam.dvr_name.toLowerCase().includes(term)) ||
      (cam.client_name && cam.client_name.toLowerCase().includes(term)) ||
      `canal ${cam.channel_number}`.includes(term);

    const matchesStatus =
      statusFilter === 'all' ? true : cam.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Câmeras e Canais RTMP
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gere tokens únicos e URLs de push RTMP para configurar na transmissão dos gravadores.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowGuideModal(true)}
            className="px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="text-blue-400">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            Guia de Configuração no DVR
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-sm flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Nova Câmera
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar por câmera, canal, cliente ou DVR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="sm:w-60">
          <select
            value={selectedDvrId}
            onChange={(e) => handleDvrFilterChange(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">Todos os DVRs</option>
            {dvrs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.client_name})
              </option>
            ))}
          </select>
        </div>

        <div className="sm:w-44">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="all">Todos os Status</option>
            <option value="streaming">Transmitindo (Ao Vivo)</option>
            <option value="active">Pronta (Standby)</option>
            <option value="inactive">Inativa</option>
          </select>
        </div>
      </div>

      {/* Cameras List */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-900 rounded-2xl border border-slate-800"></div>
          ))}
        </div>
      ) : filteredCameras.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
          <p className="text-sm text-slate-300 font-medium">Nenhuma câmera encontrada.</p>
          <p className="text-xs text-slate-500 mt-1">
            {selectedDvrId ? 'Nenhuma câmera cadastrada para este DVR.' : 'Clique em "Nova Câmera" para criar um canal RTMP.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCameras.map((cam) => {
            const isLive = cam.status === 'streaming';
            return (
              <div
                key={cam.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm"
              >
                {/* Left: Camera identification */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 border ${
                    isLive
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-sm shadow-emerald-500/10'
                      : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
                  }`}>
                    CH {cam.channel_number}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-base text-white truncate">{cam.name}</h3>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border flex items-center gap-1 ${
                        isLive
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : cam.status === 'active'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-slate-800 border-slate-700 text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : cam.status === 'active' ? 'bg-amber-400' : 'bg-slate-600'}`}></span>
                        {isLive ? 'AO VIVO' : cam.status === 'active' ? 'Pronta' : 'Inativa'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-slate-300 font-medium">{cam.client_name}</span>
                      <span className="text-slate-600">&bull;</span>
                      <span>{cam.dvr_name}</span>
                      {cam.last_seen_at && (
                        <>
                          <span className="text-slate-600">&bull;</span>
                          <span className="text-slate-500 text-[11px]">
                            Último sinal: {new Date(cam.last_seen_at).toLocaleTimeString('pt-BR')}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Center / Right: RTMP Push URL & Token */}
                <div className="flex-1 lg:max-w-md xl:max-w-lg bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      URL de Envio RTMP (DVR):
                    </span>
                    <button
                      onClick={() => copyToClipboard(cam.rtmp_push_url, cam.id, 'rtmp')}
                      className="text-blue-400 hover:text-blue-300 font-mono font-medium text-[11px] flex items-center gap-1"
                    >
                      {copiedId === cam.id && copiedType === 'rtmp' ? (
                        <span className="text-emerald-400 font-bold">&check; Copiado!</span>
                      ) : (
                        'Copiar URL RTMP'
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-slate-300 truncate bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
                    {cam.rtmp_push_url}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
                  {/* Test Stream Simulation button */}
                  <button
                    onClick={() => toggleStreamSimulation(cam)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 ${
                      isLive
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                    title="Alternar simulação de envio RTMP para teste"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                      {isLive ? (
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                      ) : (
                        <path d="M8 5v14l11-7z"/>
                      )}
                    </svg>
                    {isLive ? 'Pausar Sinal' : 'Simular Sinal'}
                  </button>

                  {/* Preview Player button */}
                  <button
                    onClick={() => setPreviewCam(cam)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Assistir feed ao vivo"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </button>

                  {/* Edit button */}
                  <button
                    onClick={() => openEditModal(cam)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Editar canal"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(cam)}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    title="Excluir canal"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Guide Modal: Como configurar no DVR */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="text-blue-400">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
                Guia de Configuração RTMP no DVR Físico
              </h2>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-300 text-xs">
                <strong>Vantagem de Arquitetura:</strong> Como o DVR envia o stream por conexão de saída (Push RTMP), você <strong>NÃO</strong> precisa abrir portas no roteador do cliente nem contratar IP fixo ou DDNS.
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-white text-xs uppercase tracking-wider text-slate-400">
                  Passo a Passo (Intelbras / Hikvision / Dahua):
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-300 pl-1">
                  <li>Acesse o menu do DVR físico: <strong>Configurações &rarr; Rede &rarr; Transmissão / RTMP</strong>.</li>
                  <li>Habilite a opção <strong>"RTMP / Live Stream"</strong>.</li>
                  <li>Selecione o tipo de servidor como <strong>"Personalizar" (Custom)</strong>.</li>
                  <li>No campo de URL, cole a <strong>URL de Envio RTMP</strong> correspondente ao canal gerada aqui no painel.</li>
                  <li>
                    Verifique os parâmetros de codificação em <strong>Compressão / Encode</strong>:
                    <ul className="list-disc list-inside ml-5 mt-1 text-slate-400 space-y-1">
                      <li>Codec de Vídeo: <span className="text-white font-mono">H.264</span> (obrigatório para compatibilidade Web/HLS).</li>
                      <li>Codec de Áudio: <span className="text-white font-mono">AAC</span> (se houver áudio).</li>
                      <li>Taxa de quadros recomendada: <span className="text-white font-mono">15 a 20 FPS</span>.</li>
                      <li>Modo de Bitrate: <span className="text-white font-mono">VBR</span> (1024 a 2048 kbps para 1080p).</li>
                    </ul>
                  </li>
                  <li>Clique em <strong>Salvar / Aplicar</strong>. Em poucos segundos o MediaMTX autenticará o canal e o status mudará para <span className="text-emerald-400 font-semibold">AO VIVO</span>.</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-400">
                <p className="text-slate-300 font-semibold mb-1">Exemplo de Formato de URL de Envio:</p>
                rtmp://meu-servidor-cctv.com:1935/live/0d4e3391-4475-4c07-961f-d5b780f2d480
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar / Editar Câmera */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-white">
                {editingCamera ? 'Editar Câmera' : 'Nova Câmera / Canal'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {formError && (
              <div className="p-3 text-xs bg-red-950/40 border border-red-500/30 text-red-300 rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  DVR Vinculado *
                </label>
                <select
                  required
                  value={formData.dvr_device_id}
                  onChange={(e) => setFormData({ ...formData, dvr_device_id: e.target.value })}
                  disabled={Boolean(editingCamera)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">Selecione o DVR</option>
                  {dvrs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} &mdash; {d.client_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Canal nº *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="64"
                    required
                    value={formData.channel_number}
                    onChange={(e) => setFormData({ ...formData, channel_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nome da Câmera *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Portão Social, Estacionamento..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {editingCamera && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Status da Transmissão
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="streaming">streaming (Transmitindo ao vivo)</option>
                    <option value="active">active (Pronta / Standby)</option>
                    <option value="inactive">inactive (Desativada)</option>
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : editingCamera ? 'Atualizar Câmera' : 'Salvar Câmera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewCam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-4 fade-in">
            <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {previewCam.name} (Canal {previewCam.channel_number})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {previewCam.client_name} &bull; {previewCam.dvr_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewCam(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="p-4 pt-0">
              <div className="rounded-xl overflow-hidden shadow-inner border border-slate-800">
                <HlsPlayer
                  src={previewCam.hls_playback_url}
                  cameraName={previewCam.name}
                  channelNumber={previewCam.channel_number}
                  isLive={previewCam.status === 'streaming'}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="truncate">URL LL-HLS: {previewCam.hls_playback_url}</span>
                <button
                  onClick={() => copyToClipboard(previewCam.hls_playback_url, previewCam.id, 'hls')}
                  className="text-blue-400 hover:text-blue-300 text-xs shrink-0 ml-2"
                >
                  {copiedId === previewCam.id && copiedType === 'hls' ? '✓ Copiado' : 'Copiar URL'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
