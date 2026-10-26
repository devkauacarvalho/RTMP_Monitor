/**
 * controllers/camera.controller.js
 */
const crypto = require('crypto');
const db = require('../config/database');

// Monta a URL RTMP a partir das configurações do servidor
const buildRtmpUrl = (settings, streamToken) => {
  const host = settings?.mediamtx_host || 'localhost';
  const port = settings?.rtmp_port || 1935;
  const path = settings?.rtmp_app_path || '/live/';
  return `rtmp://${host}:${port}${path}${streamToken}`;
};

// Monta a URL LL-HLS para o player
const buildHlsUrl = (settings, streamToken) => {
  const host = settings?.mediamtx_host || 'localhost';
  const port = settings?.hls_port || 8554;
  const path = settings?.rtmp_app_path || '/live/';
  return `http://${host}:${port}${path}${streamToken}/index.m3u8`;
};

exports.list = async (req, res, next) => {
  try {
    const { dvr_device_id } = req.query;
    const cameras = await db('cameras').select('*').orderBy('channel_number');
    const filtered = dvr_device_id ? cameras.filter((c) => c.dvr_device_id === dvr_device_id) : cameras;

    const dvrs = await db('dvr_devices').select('*');
    const clients = await db('clients').select('*');
    const settings = await db('server_settings').where({ id: 1 }).first();

    const enriched = filtered.map((cam) => {
      const dvr = dvrs.find((d) => d.id === cam.dvr_device_id) || {};
      const client = clients.find((c) => c.id === dvr.client_id) || {};
      return {
        ...cam,
        dvr_name: dvr.name || 'DVR Desconhecido',
        dvr_model: dvr.model,
        client_id: client.id,
        client_name: client.name || 'Cliente Desconhecido',
        rtmp_push_url: buildRtmpUrl(settings, cam.stream_token),
        hls_playback_url: buildHlsUrl(settings, cam.stream_token),
      };
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { dvr_device_id, channel_number, name } = req.body;
    if (!dvr_device_id) return res.status(400).json({ error: 'O DVR é obrigatório.' });
    if (!name || !name.trim()) return res.status(400).json({ error: 'O nome da câmera é obrigatório.' });

    const dvr = await db('dvr_devices').where({ id: dvr_device_id }).first();
    if (!dvr) return res.status(404).json({ error: 'DVR informado não existe.' });

    const channelNum = parseInt(channel_number, 10) || 1;

    // Check unique channel on same DVR
    const existing = await db('cameras').where({ dvr_device_id, channel_number: channelNum }).first();
    if (existing) {
      return res.status(409).json({ error: `O canal ${channelNum} já está cadastrado para este DVR.` });
    }

    const stream_token = crypto.randomUUID();
    const [camera] = await db('cameras')
      .insert({
        id: crypto.randomUUID(),
        dvr_device_id,
        channel_number: channelNum,
        name: name.trim(),
        stream_token,
        status: 'active',
        last_seen_at: null,
      })
      .returning('*');

    const settings = await db('server_settings').where({ id: 1 }).first();
    res.status(201).json({
      ...camera,
      rtmp_push_url: buildRtmpUrl(settings, camera.stream_token),
      hls_playback_url: buildHlsUrl(settings, camera.stream_token),
    });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const camera = await db('cameras').where({ id: req.params.id }).first();
    if (!camera) return res.status(404).json({ error: 'Câmera não encontrada.' });

    const dvr = await db('dvr_devices').where({ id: camera.dvr_device_id }).first();
    const client = dvr ? await db('clients').where({ id: dvr.client_id }).first() : null;
    const settings = await db('server_settings').where({ id: 1 }).first();

    res.json({
      ...camera,
      dvr,
      client,
      rtmp_push_url: buildRtmpUrl(settings, camera.stream_token),
      hls_playback_url: buildHlsUrl(settings, camera.stream_token),
    });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { name, status, channel_number } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'streaming') {
        updateData.last_seen_at = new Date().toISOString();
      }
    }
    if (channel_number !== undefined) updateData.channel_number = parseInt(channel_number, 10);
    updateData.updated_at = new Date().toISOString();

    const [camera] = await db('cameras')
      .where({ id: req.params.id })
      .update(updateData)
      .returning('*');

    if (!camera) return res.status(404).json({ error: 'Câmera não encontrada.' });

    const settings = await db('server_settings').where({ id: 1 }).first();
    res.json({
      ...camera,
      rtmp_push_url: buildRtmpUrl(settings, camera.stream_token),
      hls_playback_url: buildHlsUrl(settings, camera.stream_token),
    });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    // Delete permissions linked to this camera
    await db('viewer_permissions').where({ camera_id: req.params.id }).del();
    const deleted = await db('cameras').where({ id: req.params.id }).del();
    if (!deleted) return res.status(404).json({ error: 'Câmera não encontrada.' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// Retorna a URL RTMP gerada para configurar no DVR
exports.getRtmpUrl = async (req, res, next) => {
  try {
    const camera = await db('cameras').where({ id: req.params.id }).first();
    if (!camera) return res.status(404).json({ error: 'Câmera não encontrada.' });

    const settings = await db('server_settings').where({ id: 1 }).first();
    res.json({
      camera_id: camera.id,
      camera_name: camera.name,
      stream_token: camera.stream_token,
      rtmp_push_url: buildRtmpUrl(settings, camera.stream_token),
      hls_playback_url: buildHlsUrl(settings, camera.stream_token),
    });
  } catch (err) {
    next(err);
  }
};

// Rota para visualizadores — retorna todas as câmeras permitidas com seu status em tempo real
exports.getMyCamera = async (req, res, next) => {
  try {
    const viewerId = req.user.id;
    const settings = await db('server_settings').where({ id: 1 }).first();

    const permissions = await db('viewer_permissions').where({ viewer_user_id: viewerId }).select('camera_id');
    const allowedCameraIds = permissions.map((p) => p.camera_id);

    const allCameras = await db('cameras').select('*');
    const dvrs = await db('dvr_devices').select('*');
    const clients = await db('clients').select('*');

    const authorizedCameras = allCameras.filter((c) => allowedCameraIds.includes(c.id));

    const result = authorizedCameras.map((cam) => {
      const dvr = dvrs.find((d) => d.id === cam.dvr_device_id) || {};
      const client = clients.find((cl) => cl.id === dvr.client_id) || {};
      return {
        id: cam.id,
        name: cam.name,
        channel_number: cam.channel_number,
        status: cam.status,
        last_seen_at: cam.last_seen_at,
        dvr_name: dvr.name || 'DVR',
        client_name: client.name || 'Local',
        hls_url: buildHlsUrl(settings, cam.stream_token),
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Rota para visualizador acessar uma câmera específica permitida
exports.getMyCameraById = async (req, res, next) => {
  try {
    const viewerId = req.user.id;
    const { id } = req.params;

    // Check permission
    const perm = await db('viewer_permissions').where({ viewer_user_id: viewerId, camera_id: id }).first();
    if (!perm && req.user.role !== 'tech') {
      return res.status(403).json({ error: 'Acesso negado para esta câmera.' });
    }

    const camera = await db('cameras').where({ id }).first();
    if (!camera) return res.status(404).json({ error: 'Câmera não encontrada.' });

    const dvr = await db('dvr_devices').where({ id: camera.dvr_device_id }).first();
    const client = dvr ? await db('clients').where({ id: dvr.client_id }).first() : null;
    const settings = await db('server_settings').where({ id: 1 }).first();

    res.json({
      ...camera,
      dvr_name: dvr?.name,
      dvr_model: dvr?.model,
      client_name: client?.name,
      hls_url: buildHlsUrl(settings, camera.stream_token),
    });
  } catch (err) {
    next(err);
  }
};
