/**
 * controllers/settings.controller.js
 */
const db = require('../config/database');

exports.get = async (req, res, next) => {
  try {
    let settings = await db('server_settings').where({ id: 1 }).first();
    if (!settings) {
      settings = {
        id: 1,
        mediamtx_host: 'localhost',
        rtmp_port: 1935,
        hls_port: 8554,
        rtmp_app_path: '/live/',
        webhook_enabled: true,
        webhook_secret: 'rtmp_media_webhook_secret_key',
      };
    }
    res.json(settings);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { mediamtx_host, rtmp_port, hls_port, rtmp_app_path, webhook_enabled, webhook_secret } = req.body;
    const updateData = {};
    if (mediamtx_host !== undefined) updateData.mediamtx_host = mediamtx_host.trim();
    if (rtmp_port !== undefined) updateData.rtmp_port = parseInt(rtmp_port, 10);
    if (hls_port !== undefined) updateData.hls_port = parseInt(hls_port, 10);
    if (rtmp_app_path !== undefined) updateData.rtmp_app_path = rtmp_app_path.trim();
    if (webhook_enabled !== undefined) updateData.webhook_enabled = Boolean(webhook_enabled);
    if (webhook_secret !== undefined) updateData.webhook_secret = webhook_secret.trim();
    updateData.updated_by = req.user.id;
    updateData.updated_at = new Date().toISOString();

    const [updated] = await db('server_settings')
      .where({ id: 1 })
      .update(updateData)
      .returning('*');

    res.json(updated || updateData);
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const clients = await db('clients').select('*');
    const dvrs = await db('dvr_devices').select('*');
    const cameras = await db('cameras').select('*');
    const viewers = await db('users').where({ role: 'viewer' }).select('id');
    const settings = await db('server_settings').where({ id: 1 }).first();

    const streamingCameras = cameras.filter((c) => c.status === 'streaming');
    const activeCameras = cameras.filter((c) => c.status === 'active');
    const inactiveCameras = cameras.filter((c) => c.status === 'inactive');

    res.json({
      total_clients: clients.length,
      active_clients: clients.filter((c) => c.is_active).length,
      total_dvrs: dvrs.length,
      active_dvrs: dvrs.filter((d) => d.is_active).length,
      total_cameras: cameras.length,
      streaming_cameras: streamingCameras.length,
      active_cameras: activeCameras.length,
      inactive_cameras: inactiveCameras.length,
      total_viewers: viewers.length,
      server_settings: settings,
      recent_cameras: cameras.slice(0, 6),
    });
  } catch (err) {
    next(err);
  }
};
