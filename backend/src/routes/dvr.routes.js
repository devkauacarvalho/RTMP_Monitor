/**
 * routes/dvr.routes.js — Dispositivos DVR (Técnico only)
 */
const router = require('express').Router();
const { authenticate, requireTech } = require('../middleware/auth.middleware');
const dvrController = require('../controllers/dvr.controller');

router.use(authenticate, requireTech);

router.get('/', dvrController.list);                              // Listar todos (com filtro por client_id)
router.post('/', dvrController.create);                          // Criar novo DVR
router.get('/:id', dvrController.getOne);                        // Detalhes de um DVR
router.put('/:id', dvrController.update);                        // Editar DVR
router.delete('/:id', dvrController.remove);                     // Remover DVR

module.exports = router;
