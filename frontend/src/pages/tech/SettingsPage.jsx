/**
 * pages/tech/SettingsPage.jsx
 * Configurações do Servidor de Mídia MediaMTX, Webhook de Autenticação e Credenciais Técnicas
 */
import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // Server Settings Form
  const [formData, setFormData] = useState({
    mediamtx_host: 'localhost',
    rtmp_port: 1935,
    hls_port: 8554,
    rtmp_app_path: '/live/',
    webhook_enabled: true,
    webhook_secret: 'rtmp_media_webhook_secret_key',
  });

  // Password Change Form
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [changingPass, setChangingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');

  // Webhook Test State
  const [testToken, setTestToken] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testingWebhook, setTestingWebhook] = useState(false);

  // Copy YAML config
  const [copiedYaml, setCopiedYaml] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await api.get('/settings');
        setFormData(res.data);
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setSettingsError('');
      setSettingsSuccess('');
      await api.put('/settings', formData);
      setSettingsSuccess('Configurações do MediaMTX salvas com sucesso!');
      setTimeout(() => setSettingsSuccess(''), 4000);
    } catch (err) {
      setSettingsError(err.response?.data?.error || 'Erro ao salvar configurações.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPassError('As senhas não coincidem.');
      return;
    }
    if (passwordData.new_password.length < 4) {
      setPassError('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    try {
      setChangingPass(true);
      setPassError('');
      setPassSuccess('');
      await api.put('/users/me/password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      setPassSuccess('Sua senha foi alterada com sucesso!');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setPassSuccess(''), 4000);
    } catch (err) {
      setPassError(err.response?.data?.error || 'Erro ao alterar senha.');
    } finally {
      setChangingPass(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!testToken.trim()) {
      alert('Digite ou cole um token de câmera para testar.');
      return;
    }
    try {
      setTestingWebhook(true);
      setTestResult(null);
      const res = await api.post('/webhook/stream-auth', {
        action: 'publish',
        path: `live/${testToken.trim()}`,
        secret: formData.webhook_secret,
      });
      setTestResult({ success: true, message: res.data.message || 'Stream autorizado com sucesso pelo MediaMTX!' });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.error || 'Stream rejeitado: token inexistente ou incorreto.',
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const sampleMediamtxYaml = `# mediamtx.yml - Arquivo de configuração de produção
# Servidor de streaming RTMP para LL-HLS com autenticação via Webhook

logLevel: info
logDestinations: [stdout]

# Servidor RTMP (Porta de envio do DVR físico)
rtmp: yes
rtmpAddress: :${formData.rtmp_port || 1935}

# Servidor HLS (Porta de visualização do navegador/PWA)
hls: yes
hlsAddress: :${formData.hls_port || 8554}
hlsVariant: lowLatency
hlsSegmentCount: 3
hlsSegmentDuration: 1s
hlsPartDuration: 200ms

# Autenticação de Publicadores (DVRs) via Webhook no RTMP Monitor
authMethod: http
authHTTPAddress: http://${window.location.host}/webhook/stream-auth

paths:
  live/*:
    source: publisher
    # Configurações de baixa latência
    runOnInitRestart: yes
`;

  const copyYaml = () => {
    navigator.clipboard.writeText(sampleMediamtxYaml);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-slate-900 rounded-xl w-64"></div>
        <div className="h-64 bg-slate-900 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in max-w-4xl">
      {/* Top Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          Configurações do Sistema
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Ajuste os parâmetros do servidor MediaMTX, portas de rede, autenticação por webhook e segurança.
        </p>
      </div>

      {/* MediaMTX Server Parameters Form */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Servidor de Mídia (MediaMTX)</h2>
            <p className="text-xs text-slate-400">
              Host e portas utilizados para construir as URLs de envio RTMP e reprodução LL-HLS.
            </p>
          </div>
        </div>

        {settingsSuccess && (
          <div className="p-3 text-xs bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-lg">
            {settingsSuccess}
          </div>
        )}
        {settingsError && (
          <div className="p-3 text-xs bg-red-950/40 border border-red-500/30 text-red-300 rounded-lg">
            {settingsError}
          </div>
        )}

        <form onSubmit={handleSettingsSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Host / IP / Domínio do MediaMTX *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: stream.meudominio.com ou 192.168.1.50"
                value={formData.mediamtx_host}
                onChange={(e) => setFormData({ ...formData, mediamtx_host: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Coloque o IP público da sua VPS ou subdomínio onde o MediaMTX está rodando.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Caminho da Aplicação (Path)
              </label>
              <input
                type="text"
                required
                value={formData.rtmp_app_path}
                onChange={(e) => setFormData({ ...formData, rtmp_app_path: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Padrão: /live/ (ex: rtmp://host:1935/live/&lt;token&gt;)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Porta RTMP de Envio (DVR &rarr; Servidor)
              </label>
              <input
                type="number"
                required
                value={formData.rtmp_port}
                onChange={(e) => setFormData({ ...formData, rtmp_port: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Padrão RTMP: 1935</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Porta LL-HLS de Saída (Servidor &rarr; Web Player)
              </label>
              <input
                type="number"
                required
                value={formData.hls_port}
                onChange={(e) => setFormData({ ...formData, hls_port: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Padrão HLS MediaMTX: 8554 ou 8888</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Chave Secreta do Webhook (Token de Autenticação)
            </label>
            <input
              type="text"
              required
              value={formData.webhook_secret}
              onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Protege o endpoint /webhook/stream-auth contra publicações e requisições não autorizadas.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {savingSettings ? 'Salvando...' : 'Salvar Parâmetros do Servidor'}
            </button>
          </div>
        </form>
      </div>

      {/* Webhook Tester Section */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Simulador / Teste de Webhook MediaMTX</h2>
            <p className="text-xs text-slate-400">
              Valide se um token de canal RTMP é aceito pelo webhook (/webhook/stream-auth).
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            placeholder="Cole o stream_token da câmera (ex: 0d4e3391-4475-4c07-961f-d5b780f2d480)..."
            value={testToken}
            onChange={(e) => setTestToken(e.target.value)}
            className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={handleTestWebhook}
            disabled={testingWebhook}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors shrink-0 disabled:opacity-50"
          >
            {testingWebhook ? 'Testando...' : 'Testar Token'}
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3 text-xs rounded-xl border ${
              testResult.success
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/40 border-red-500/30 text-red-300'
            }`}
          >
            <span className="font-bold">{testResult.success ? '✓ Sucesso: ' : '✗ Rejeitado: '}</span>
            {testResult.message}
          </div>
        )}
      </div>

      {/* Production mediamtx.yml Snippet */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-amber-400">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              Arquivo mediamtx.yml Pronto para Produção
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Copie e cole este conteúdo diretamente no seu servidor MediaMTX.
            </p>
          </div>

          <button
            onClick={copyYaml}
            className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
          >
            {copiedYaml ? (
              <span className="text-emerald-400">✓ Copiado!</span>
            ) : (
              'Copiar YAML'
            )}
          </button>
        </div>

        <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
          {sampleMediamtxYaml}
        </pre>
      </div>

      {/* Technician Password Change */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Alterar Senha do Técnico</h2>
            <p className="text-xs text-slate-400">Atualize sua senha de administrador.</p>
          </div>
        </div>

        {passSuccess && (
          <div className="p-3 text-xs bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-lg">
            {passSuccess}
          </div>
        )}
        {passError && (
          <div className="p-3 text-xs bg-red-950/40 border border-red-500/30 text-red-300 rounded-lg">
            {passError}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Senha Atual *
            </label>
            <input
              type="password"
              required
              value={passwordData.current_password}
              onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nova Senha *
            </label>
            <input
              type="password"
              required
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Confirmar Nova Senha *
            </label>
            <input
              type="password"
              required
              value={passwordData.confirm_password}
              onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={changingPass}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {changingPass ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
