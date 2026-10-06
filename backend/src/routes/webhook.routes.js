/**
 * routes/webhook.routes.js
 *
 * Endpoint consumido pelo MediaMTX para validar se um stream_token
 * é legítimo antes de aceitar a conexão RTMP do DVR.
 *
 * O MediaMTX envia um POST quando uma nova publicação é iniciada.
 * Referência: https://github.com/bluenviron/mediamtx#authentication
 *
 * Autenticação: via header X-Webhook-Secret (não usa JWT).
 */
const router = require('express').Router();
const webhookController = require('../controllers/webhook.controller');

router.post('/stream-auth', webhookController.streamAuth);

module.exports = router;
