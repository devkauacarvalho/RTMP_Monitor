/**
 * routes/camera.routes.js — Câmeras/Canais
 *
 * Técnico: CRUD completo + gera URL RTMP
 * Visualizador: Apenas GET das câmeras vinculadas a ele
 */
const router = require('express').Router();
const { authenticate, requireTech } = require('../middleware/auth.middleware');
const cameraController = require('../controllers/camera.controller');

// Rotas para o Visualizador autenticado — retorna apenas as câmeras permitidas
router.get('/my', authenticate, cameraController.getMyCamera);

// Rotas de Técnico
router.use(authenticate, requireTech);
router.get('/', cameraController.list);
router.post('/', cameraController.create);
router.get('/:id', cameraController.getOne);
router.put('/:id', cameraController.update);
router.delete('/:id', cameraController.remove);

// Retorna a URL RTMP gerada para copiar e configurar no DVR
router.get('/:id/rtmp-url', cameraController.getRtmpUrl);

module.exports = router;
