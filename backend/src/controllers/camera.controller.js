/**
 * controllers/camera.controller.js
 */
const db = require('../config/database');

// Monta a URL RTMP a partir das configurações do servidor
const buildRtmpUrl = (settings, streamToken) =>
  `rtmp://${settings.mediamtx_host}:${settings.rtmp_port}${settings.rtmp_app_path}${streamToken}`;

// Monta a URL LL-HLS para o player
const buildHlsUrl = (settings, streamToken) =>
  `http://${settings.mediamtx_host}:${settings.hls_port}${settings.rtmp_app_path}${streamToken}/index.m3u8`;

exports.list = async (req, res, next) => {
  try {
    const { dvr_device_id } = req.query;
    const query = db('cameras').select('*').orderBy('channel_number');
    if (dvr_device_id) query.where({ dvr_device_id });
    const cameras = await query;
    res.json(cameras);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { dvr_device_id, channel_number, name } = req.body;
    const [camera] = await db('cameras')
      .insert({ dvr_device_id, channel_number, name })
      .returning('*');
    res.status(201).json(camera);
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const camera = await db('cameras').where({ id: req.params.id }).first();
    if (!camera) return res.status(404).json({ error: 'Câmera não encontrada.' });
    res.json(camera);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { name, status } = req.body;
    const [camera] = await db('cameras')
      .where({ id: req.params.id })
      .update({ name, status, updated_at: new Date() })
      .returning('*');
    if (!camera) return res.status(404).json({ error: 'Câmera não encontrada.' });
    res.json(camera);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const deleted = await db('cameras').where({ id: req.params.id }).del();
    if (!deleted) return res.status(404).json({ error: 'Câmera não encontrada.' });
    res.status(204).send();
  } catch (err) { next(err); }
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
  } catch (err) { next(err); }
};

// Rota para visualizadores — retorna apenas câmeras com permissão
exports.getMyCamera = async (req, res, next) => {
  try {
    const viewerId = req.user.id;
    const settings = await db('server_settings').where({ id: 1 }).first();

    const cameras = await db('cameras as c')
      .join('viewer_permissions as vp', 'vp.camera_id', 'c.id')
      .where('vp.viewer_user_id', viewerId)
      .where('c.status', 'streaming')  // Somente câmeras ativas transmitindo
      .select(
        'c.id',
        'c.name',
        'c.channel_number',
        'c.status',
        'c.stream_token',
        'c.last_seen_at'
      );

    // Injeta a URL de playback sem expor o stream_token na resposta
    const result = cameras.map((cam) => ({
      id: cam.id,
      name: cam.name,
      channel_number: cam.channel_number,
      status: cam.status,
      last_seen_at: cam.last_seen_at,
      hls_url: buildHlsUrl(settings, cam.stream_token),
    }));

    res.json(result);
  } catch (err) { next(err); }
};
