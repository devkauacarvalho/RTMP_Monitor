/**
 * server.js — Root Entry Point for AI Studio
 * Unifies the Express API backend and Vite frontend on port 3000 (0.0.0.0).
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const app = require('./backend/src/app');

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const cliPort = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : null;
const PORT = cliPort || parseInt(process.env.PORT || '3000', 10) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Strip frame blocking headers at the top level
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Resource-Policy');
  next();
});

async function start() {
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        configFile: path.resolve(__dirname, 'frontend/vite.config.js'),
        root: path.resolve(__dirname, 'frontend'),
        server: {
          middlewareMode: true,
          hmr: false,
          host: '0.0.0.0',
          port: PORT,
        },
        appType: 'spa',
      });

      app.use(vite.middlewares);
      console.log('[SERVER] Vite development middleware attached.');
    } catch (err) {
      console.warn('[SERVER] Could not load Vite dev middleware, serving static files:', err.message);
      setupStaticServing();
    }
  } else {
    setupStaticServing();
  }

  function setupStaticServing() {
    const distPath = path.resolve(__dirname, 'frontend/dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] RTMP Monitor running on http://0.0.0.0:${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

start();
