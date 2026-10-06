/**
 * server.js — Ponto de entrada do Backend
 */
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[SERVER] RTMP Monitor API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});
