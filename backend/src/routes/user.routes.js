/**
 * routes/user.routes.js
 * Gerenciamento de usuários (apenas técnicos)
 */
const router = require('express').Router();
const { authenticate, requireTech } = require('../middleware/auth.middleware');
const userController = require('../controllers/user.controller');

router.use(authenticate, requireTech);

router.get('/', userController.listViewers);
router.post('/', userController.createViewer);
router.get('/:id', userController.getViewer);
router.put('/:id', userController.updateViewer);
router.delete('/:id', userController.deleteViewer);

// Rota para o técnico alterar a própria senha
router.put('/me/password', userController.changeOwnPassword);

module.exports = router;
