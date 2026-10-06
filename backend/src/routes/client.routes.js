/**
 * routes/client.routes.js — Clientes (Técnico only)
 */
const router = require('express').Router();
const { authenticate, requireTech } = require('../middleware/auth.middleware');
const clientController = require('../controllers/client.controller');

router.use(authenticate, requireTech);

router.get('/', clientController.list);
router.post('/', clientController.create);
router.get('/:id', clientController.getOne);
router.put('/:id', clientController.update);
router.delete('/:id', clientController.remove);

module.exports = router;
