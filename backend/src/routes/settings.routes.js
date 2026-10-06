/**
 * routes/settings.routes.js — Configurações do Servidor MediaMTX (Técnico only)
 */
const router = require('express').Router();
const { authenticate, requireTech } = require('../middleware/auth.middleware');
const settingsController = require('../controllers/settings.controller');

router.use(authenticate, requireTech);

router.get('/', settingsController.get);
router.put('/', settingsController.update);

module.exports = router;
