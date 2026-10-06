/**
 * routes/auth.routes.js — Login público
 */
const router = require('express').Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');

router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username obrigatório.'),
    body('password').notEmpty().withMessage('Senha obrigatória.'),
  ],
  authController.login
);

module.exports = router;
