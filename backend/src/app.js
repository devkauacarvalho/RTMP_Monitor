/**
 * app.js — Configuração do Express (middlewares, rotas, error handler)
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const clientRoutes = require('./routes/client.routes');
const dvrRoutes = require('./routes/dvr.routes');
const cameraRoutes = require('./routes/camera.routes');
const permissionRoutes = require('./routes/permission.routes');
const settingsRoutes = require('./routes/settings.routes');
const webhookRoutes = require('./routes/webhook.routes');

const app = express();

// Trust reverse proxy (nginx / Cloud Run) for accurate IP resolution in rate limiter
app.set('trust proxy', 1);

// ─── Security Middlewares ───────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  frameguard: false,
}));

// Allow iframe embedding within AI Studio
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Resource-Policy');
  next();
});

app.use(cors({
  origin: true,
  credentials: true,
}));

// ─── Rate Limiting (API only) ────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});
app.use('/api', limiter);

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/v1/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── API Routes ──────────────────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/clients`, clientRoutes);
app.use(`${API}/dvr`, dvrRoutes);
app.use(`${API}/dvr-devices`, dvrRoutes);
app.use(`${API}/cameras`, cameraRoutes);
app.use(`${API}/permissions`, permissionRoutes);
app.use(`${API}/settings`, settingsRoutes);

// Webhook — rota separada sem autenticação JWT (validada por secret header)
app.use('/webhook', webhookRoutes);

// ─── 404 Handler for API ─────────────────────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message, err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;
