/**
 * middleware/auth.middleware.js
 *
 * Middleware de autenticação JWT e verificação de role.
 */
const jwt = require('jsonwebtoken');

/**
 * Verifica se o token JWT é válido.
 * Injeta req.user = { id, username, role }
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rtmp_monitor_dev_secret_jwt_key_2026');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

/**
 * Garante que o usuário autenticado possui o role 'tech'.
 * Deve ser usado APÓS o middleware authenticate.
 */
const requireTech = (req, res, next) => {
  if (req.user?.role !== 'tech') {
    return res.status(403).json({ error: 'Acesso restrito a técnicos.' });
  }
  next();
};

/**
 * Garante que o usuário possui o role 'viewer'.
 * Deve ser usado APÓS o middleware authenticate.
 */
const requireViewer = (req, res, next) => {
  if (req.user?.role !== 'viewer') {
    return res.status(403).json({ error: 'Acesso restrito a visualizadores.' });
  }
  next();
};

module.exports = { authenticate, requireTech, requireViewer };
