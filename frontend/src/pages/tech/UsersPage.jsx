/**
 * pages/tech/UsersPage.jsx
 * Gerenciamento de Usuários Visualizadores e Matriz de Permissões de Acesso às Câmeras
 */
import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function UsersPage() {
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Create/Edit Viewer Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingViewer, setEditingViewer] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
    is_active: true,
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Permissions Modal
  const [permModal, setPermModal] = useState({ open: false, viewer: null });
  const [allCameras, setAllCameras] = useState([]);
  const [selectedCamIds, setSelectedCamIds] = useState([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permSubmitting, setPermSubmitting] = useState(false);

  const fetchViewers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/viewers');
      setViewers(res.data);
    } catch (err) {
      console.error('Erro ao buscar visualizadores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViewers();
  }, []);

  const openCreateModal = () => {
    setEditingViewer(null);
    setFormData({
      username: '',
      full_name: '',
      password: '',
      is_active: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (viewer) => {
    setEditingViewer(viewer);
    setFormData({
      username: viewer.username,
      full_name: viewer.full_name,
      password: '',
      is_active: viewer.is_active,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setFormError('Nome completo é obrigatório.');
      return;
    }
    if (!editingViewer) {
      if (!formData.username.trim()) {
        setFormError('Nome de usuário é obrigatório.');
        return;
      }
      if (!formData.password || formData.password.length < 4) {
        setFormError('A senha deve ter pelo menos 4 caracteres.');
        return;
      }
    }

    try {
      setSubmitting(true);
      setFormError('');

      if (editingViewer) {
        const payload = {
          full_name: formData.full_name,
          is_active: formData.is_active,
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }
        await api.put(`/users/viewers/${editingViewer.id}`, payload);
      } else {
        await api.post('/users/viewers', {
          username: formData.username,
          full_name: formData.full_name,
          password: formData.password,
        });
      }

      setIsModalOpen(false);
      fetchViewers();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao salvar usuário.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (viewer) => {
    if (!window.confirm(`Tem certeza que deseja excluir o visualizador "${viewer.full_name}" (@${viewer.username})?`)) {
      return;
    }

    try {
      await api.delete(`/users/viewers/${viewer.id}`);
      fetchViewers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir usuário.');
    }
  };

  // Open Permissions Modal
  const openPermissionsModal = async (viewer) => {
    setPermModal({ open: true, viewer });
    setPermLoading(true);

    try {
      const [camerasRes, userPermRes] = await Promise.all([
        api.get('/cameras'),
        api.get(`/permissions/${viewer.id}`),
      ]);
      setAllCameras(camerasRes.data);
      setSelectedCamIds(userPermRes.data.map((p) => p.camera_id));
    } catch (err) {
      console.error('Erro ao buscar permissões:', err);
    } finally {
      setPermLoading(false);
    }
  };

  const toggleCameraPermission = (camId) => {
    setSelectedCamIds((prev) =>
      prev.includes(camId) ? prev.filter((id) => id !== camId) : [...prev, camId]
    );
  };

  const selectAllCameras = () => {
    setSelectedCamIds(allCameras.map((c) => c.id));
  };

  const deselectAllCameras = () => {
    setSelectedCamIds([]);
  };

  const handleSavePermissions = async () => {
    try {
      setPermSubmitting(true);
      await api.post('/permissions', {
        viewer_user_id: permModal.viewer.id,
        camera_ids: selectedCamIds,
      });
      setPermModal({ open: false, viewer: null });
      fetchViewers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar permissões.');
    } finally {
      setPermSubmitting(false);
    }
  };

  const filteredViewers = viewers.filter((v) => {
    const term = searchTerm.toLowerCase();
    return (
      v.full_name.toLowerCase().includes(term) ||
      v.username.toLowerCase().includes(term)
    );
  });

  // Group cameras by Client and DVR for easy selection
  const groupedCameras = allCameras.reduce((acc, cam) => {
    const groupKey = `${cam.client_name} — ${cam.dvr_name}`;
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(cam);
    return acc;
  }, {});

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Usuários Visualizadores
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Cadastre os clientes finais e defina permissões estritas para quais câmeras cada um pode assistir.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="self-start sm:self-auto px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-sm flex items-center gap-2"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          Novo Visualizador
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          type="text"
          placeholder="Buscar por nome ou usuário..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Viewers Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-slate-900 rounded-2xl border border-slate-800"></div>
          ))}
        </div>
      ) : filteredViewers.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
          <p className="text-sm text-slate-300 font-medium">Nenhum visualizador cadastrado.</p>
          <p className="text-xs text-slate-500 mt-1">Clique em "Novo Visualizador" para autorizar acessos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredViewers.map((viewer) => (
            <div
              key={viewer.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 font-bold text-sm">
                      {viewer.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-white">{viewer.full_name}</h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">@{viewer.username}</p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full border ${
                    viewer.is_active
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}>
                    {viewer.is_active ? 'Ativo' : 'Bloqueado'}
                  </span>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Câmeras Autorizadas:</span>
                  <span className="font-bold text-blue-400 font-mono">
                    {viewer.permissions_count || 0} canais
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => openPermissionsModal(viewer)}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Permissões ({viewer.permissions_count || 0})
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(viewer)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Editar usuário"
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(viewer)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    title="Remover usuário"
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

      {/* Modal Criar / Editar Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-white">
                {editingViewer ? 'Editar Visualizador' : 'Novo Usuário Visualizador'}
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
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Usuário de Login *
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingViewer)}
                  placeholder="Ex: joao.silva"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
                {editingViewer && (
                  <p className="text-[11px] text-slate-500 mt-1">O login não pode ser alterado após criação.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {editingViewer ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha de Acesso *'}
                </label>
                <input
                  type="password"
                  placeholder={editingViewer ? '••••••••' : 'Mínimo 4 caracteres'}
                  required={!editingViewer}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {editingViewer && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="viewer_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <label htmlFor="viewer_active" className="text-xs text-slate-300 cursor-pointer">
                    Conta Ativa (Permitir Login)
                  </label>
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
                  {submitting ? 'Salvando...' : editingViewer ? 'Atualizar Usuário' : 'Criar Visualizador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {permModal.open && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  Permissões de Câmeras
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualizador: <strong className="text-white">{permModal.viewer?.full_name}</strong> (@{permModal.viewer?.username})
                </p>
              </div>
              <button
                onClick={() => setPermModal({ open: false, viewer: null })}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center justify-between gap-2 text-xs text-slate-400 pt-1">
              <span>
                <strong className="text-blue-400">{selectedCamIds.length}</strong> de {allCameras.length} câmeras selecionadas
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllCameras}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                >
                  Marcar Todas
                </button>
                <span className="text-slate-600">&bull;</span>
                <button
                  type="button"
                  onClick={deselectAllCameras}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Desmarcar Todas
                </button>
              </div>
            </div>

            {/* Camera Checklist Grouped */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-1">
              {permLoading ? (
                <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
                  Carregando lista de câmeras...
                </div>
              ) : Object.keys(groupedCameras).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhuma câmera cadastrada no sistema. Cadastre clientes e DVRs primeiro.
                </div>
              ) : (
                Object.entries(groupedCameras).map(([groupName, groupCams]) => (
                  <div key={groupName} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-2.5">
                    <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {groupName}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                      {groupCams.map((cam) => {
                        const checked = selectedCamIds.includes(cam.id);
                        return (
                          <label
                            key={cam.id}
                            className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              checked
                                ? 'bg-blue-600/15 border-blue-500/40 text-white'
                                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCameraPermission(cam.id)}
                              className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                            />
                            <div className="truncate">
                              <span className="font-mono text-slate-500 mr-1.5">CH {cam.channel_number}</span>
                              <span className="font-medium text-slate-200">{cam.name}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPermModal({ open: false, viewer: null })}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePermissions}
                disabled={permSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {permSubmitting ? 'Salvando...' : 'Salvar Permissões'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
