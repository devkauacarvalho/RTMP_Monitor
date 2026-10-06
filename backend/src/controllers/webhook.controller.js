/**
 * controllers/webhook.controller.js
 *
 * Valida o stream_token enviado pelo MediaMTX quando um DVR inicia publicação.
 * Retorna HTTP 200 (aceitar) ou HTTP 401 (rejeitar).
 */
const db = require('../config/database');

exports.streamAuth = async (req, res, next) => {
  try {
    // Valida o secret do webhook
    const secret = req.headers['x-webhook-secret'];
    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Webhook secret inválido.' });
    }

    // O MediaMTX envia o path da stream, ex: /live/<stream_token>
    const { path } = req.body;
    if (!path) return res.status(400).json({ error: 'Path não informado.' });

    // Extrai o token do path: /live/<token>
    const parts = path.split('/');
    const streamToken = parts[parts.length - 1];

    if (!streamToken) return res.status(401).json({ error: 'Token inválido.' });

    // Verifica se a câmera com esse token existe e está ativa
    const camera = await db('cameras')
      .where({ stream_token: streamToken, status: 'active' })
      .first('id');

    if (!camera) {
      return res.status(401).json({ error: 'Stream token não autorizado ou câmera inativa.' });
    }

    // Atualiza last_seen_at e status para 'streaming'
    await db('cameras')
      .where({ stream_token: streamToken })
      .update({ status: 'streaming', last_seen_at: new Date() });

    return res.status(200).json({ message: 'Autorizado.' });
  } catch (err) {
    next(err);
  }
};
