/**
 * pages/tech/DVRPage.jsx
 * Gerenciamento de Gravadores Digitais de Vídeo (DVRs)
 */
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

export default function DVRPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedClientId = searchParams.get('client_id') || '';

  const [dvrs, setDvrs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDvr, setEditingDvr] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    model: '',
    total_channels: 8,
    notes: '',
    is_active: true,
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Quick Add Camera Modal
  const [quickCamModal, setQuickCamModal] = useState({ open: false, dvr: null });
  const [camFormData, setCamFormData] = useState({ channel_number: 1, name: '' });
  const [camSubmitting, setCamSubmitting] = useState(false);
  const [camError, setCamError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [dvrRes, clientRes] = await Promise.all([
        api.get('/dvr', { params: selectedClientId ? { client_id: selectedClientId } : {} }),
        api.get('/clients'),
      ]);
      setDvrs(dvrRes.data);
      setClients(clientRes.data);
    } catch (err) {
      console.error('Erro ao carregar DVRs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClientId]);

  const handleClientFilterChange = (clientId) => {
    if (clientId) {
      setSearchParams({ client_id: clientId });
    } else {
      setSearchParams({});
    }
  };

  const openCreateModal = () => {
    setEditingDvr(null);
    setFormData({
      client_id: selectedClientId || (clients[0]?.id || ''),
      name: '',
      model: 'Intelbras MHDX 1116',
      total_channels: 8,
      notes: '',
      is_active: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (dvr) => {
    setEditingDvr(dvr);
    setFormData({
      client_id: dvr.client_id,
      name: dvr.name,
      model: dvr.model || '',
      total_channels: dvr.total_channels || 8,
      notes: dvr.notes || '',
      is_active: dvr.is_active,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('O nome do DVR é obrigatório.');
      return;
    }
    if (!formData.client_id) {
      setFormError('Selecione um cliente.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      if (editingDvr) {
        await api.put(`/dvr/${editingDvr.id}`, formData);
      } else {
        await api.post('/dvr', formData);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao salvar DVR.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (dvr) => {
    if (!window.confirm(`Tem certeza que deseja excluir o DVR "${dvr.name}"? Todas as ${dvr.camera_count || 0} câmeras vinculadas a ele serão removidas.`)) {
      return;
    }

    try {
      await api.delete(`/dvr/${dvr.id}`);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao remover DVR.');
    }
  };

  const openQuickAddCamera = (dvr) => {
    const nextChannel = (dvr.camera_count || 0) + 1;
    setQuickCamModal({ open: true, dvr });
    setCamFormData({
      channel_number: nextChannel <= dvr.total_channels ? nextChannel : 1,
      name: `Canal ${nextChannel}`,
    });
    setCamError('');
  };

  const handleCreateCamera = async (e) => {
    e.preventDefault();
    if (!camFormData.name.trim()) {
      setCamError('O nome da câmera é obrigatório.');
      return;
    }

    try {
      setCamSubmitting(true);
      setCamError('');
      await api.post('/cameras', {
        dvr_device_id: quickCamModal.dvr.id,
        channel_number: parseInt(camFormData.channel_number, 10),
        name: camFormData.name.trim(),
      });
      setQuickCamModal({ open: false, dvr: null });
      loadData();
    } catch (err) {
      setCamError(err.response?.data?.error || 'Erro ao adicionar câmera.');
    } finally {
      setCamSubmitting(false);
    }
  };

  const filteredDvrs = dvrs.filter((d) => {
    const term = searchTerm.toLowerCase();
    return (
      d.name.toLowerCase().includes(term) ||
      (d.model && d.model.toLowerCase().includes(term)) ||
      (d.client_name && d.client_name.toLowerCase().includes(term)) ||
      (d.notes && d.notes.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Dispositivos DVR Cadastrados
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gerencie os gravadores físicos que enviam feeds RTMP para o servidor MediaMTX.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="self-start sm:self-auto px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-sm flex items-center gap-2"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          Novo DVR
        </button>
      </div>

      {/* Filter and Search Bar */}
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
            placeholder="Buscar por DVR, modelo ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="sm:w-64">
          <select
            value={selectedClientId}
            onChange={(e) => handleClientFilterChange(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">Todos os Clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DVRs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 bg-slate-900 rounded-2xl border border-slate-800"></div>
          ))}
        </div>
      ) : filteredDvrs.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
          <p className="text-sm text-slate-300 font-medium">Nenhum DVR encontrado.</p>
          <p className="text-xs text-slate-500 mt-1">
            {selectedClientId ? 'Nenhum gravador cadastrado para o cliente selecionado.' : 'Clique em "Novo DVR" para registrar o primeiro dispositivo.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDvrs.map((dvr) => (
            <div
              key={dvr.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between shadow-sm"
            >
              <div>
                {/* Header card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-1 14H5c-.55 0-1-.45-1-1s.45-1 1-1h14c.55 0 1 .45 1 1s-.45 1-1 1zm1-4H4V8h16v6z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-white">{dvr.name}</h3>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-medium text-slate-300">{dvr.client_name}</span>
                        {dvr.model && (
                          <>
                            <span className="text-slate-600">&bull;</span>
                            <span className="text-slate-400">{dvr.model}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full border ${dvr.is_active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    {dvr.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {/* Notes if available */}
                {dvr.notes && (
                  <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
                    <span className="text-slate-500 font-semibold">Local/Obs:</span> {dvr.notes}
                  </p>
                )}

                {/* Channel & Stream Metrics */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                    <span className="block text-xs font-semibold text-slate-300">{dvr.total_channels}</span>
                    <span className="text-[10px] text-slate-500">Canais Max</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                    <span className="block text-xs font-semibold text-cyan-400">{dvr.camera_count || 0}</span>
                    <span className="text-[10px] text-slate-500">Criadas</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
                    <span className="block text-xs font-semibold text-emerald-400">{dvr.streaming_count || 0}</span>
                    <span className="text-[10px] text-slate-500">Ao Vivo</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/tech/cameras?dvr_id=${dvr.id}`}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    Ver Câmeras ({dvr.camera_count || 0}) &rarr;
                  </Link>
                  <button
                    onClick={() => openQuickAddCamera(dvr)}
                    className="text-[11px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                    title="Adicionar canal ao DVR"
                  >
                    + Câmera
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(dvr)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Editar DVR"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(dvr)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    title="Remover DVR"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar / Editar DVR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-white">
                {editingDvr ? 'Editar DVR' : 'Novo Gravador DVR'}
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
                  Cliente Vinculado *
                </label>
                <select
                  required
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  disabled={Boolean(editingDvr)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">Selecione o Cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nome / Identificação *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: DVR Portaria Principal"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Modelo do Equipamento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Intelbras MHDX 1116"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Quantidade Total de Canais Físicos
                </label>
                <select
                  value={formData.total_channels}
                  onChange={(e) => setFormData({ ...formData, total_channels: parseInt(e.target.value, 10) })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={4}>4 Canais</option>
                  <option value={8}>8 Canais</option>
                  <option value={16}>16 Canais</option>
                  <option value={32}>32 Canais</option>
                  <option value={64}>64 Canais</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Observações / Localização Física (Opcional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Ex: Instalado no rack do subsolo, IP interno 192.168.1.100..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                ></textarea>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dvr_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                />
                <label htmlFor="dvr_active" className="text-xs text-slate-300 cursor-pointer">
                  Dispositivo Ativo no Monitoramento
                </label>
              </div>

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
                  {submitting ? 'Salvando...' : editingDvr ? 'Atualizar DVR' : 'Salvar DVR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Camera Modal */}
      {quickCamModal.open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Adicionar Câmera</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vincular ao DVR: <span className="text-slate-200 font-semibold">{quickCamModal.dvr?.name}</span>
                </p>
              </div>
              <button
                onClick={() => setQuickCamModal({ open: false, dvr: null })}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {camError && (
              <div className="p-3 text-xs bg-red-950/40 border border-red-500/30 text-red-300 rounded-lg">
                {camError}
              </div>
            )}

            <form onSubmit={handleCreateCamera} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Canal nº *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={quickCamModal.dvr?.total_channels || 64}
                    required
                    value={camFormData.channel_number}
                    onChange={(e) => setCamFormData({ ...camFormData, channel_number: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nome da Câmera *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Portão de Entrada"
                    value={camFormData.name}
                    onChange={(e) => setCamFormData({ ...camFormData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
                Ao criar a câmera, um token de fluxo exclusivo e a URL RTMP de envio serão gerados automaticamente para configuração no DVR físico.
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickCamModal({ open: false, dvr: null })}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={camSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {camSubmitting ? 'Criando...' : 'Criar Câmera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
