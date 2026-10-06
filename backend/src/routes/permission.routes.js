/**
 * routes/permission.routes.js — Vínculos de Visualizador ↔ Câmera (Técnico only)
 */
const router = require('express').Router();
const { authenticate, requireTech } = require('../middleware/auth.middleware');
const permissionController = require('../controllers/permission.controller');

router.use(authenticate, requireTech);

// Listar permissões de um visualizador específico
router.get('/viewer/:viewerId', permissionController.listByViewer);

// Conceder acesso de uma câmera a um visualizador
router.post('/', permissionController.grant);

// Revogar acesso (por ID da permissão ou por viewer+camera)
router.delete('/:id', permissionController.revoke);

module.exports = router;
