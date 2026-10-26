/**
 * controllers/dvr.controller.js
 */
const crypto = require('crypto');
const db = require('../config/database');

exports.list = async (req, res, next) => {
  try {
    const { client_id } = req.query;
    const dvrs = client_id
      ? await db('dvr_devices').where({ client_id }).select('*')
      : await db('dvr_devices').select('*');

    const clients = await db('clients').select('id', 'name');
    const cameras = await db('cameras').select('*');

    const enriched = dvrs.map((dvr) => {
      const client = clients.find((c) => c.id === dvr.client_id);
      const dvrCameras = cameras.filter((cam) => cam.dvr_device_id === dvr.id);
      return {
        ...dvr,
        client_name: client ? client.name : 'Cliente desconhecido',
        camera_count: dvrCameras.length,
        streaming_count: dvrCameras.filter((c) => c.status === 'streaming').length,
      };
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { client_id, name, model, total_channels, notes } = req.body;
    if (!client_id) return res.status(400).json({ error: 'O cliente é obrigatório.' });
    if (!name || !name.trim()) return res.status(400).json({ error: 'O nome do DVR é obrigatório.' });

    const client = await db('clients').where({ id: client_id }).first();
    if (!client) return res.status(404).json({ error: 'Cliente informado não existe.' });

    const [dvr] = await db('dvr_devices')
      .insert({
        id: crypto.randomUUID(),
        client_id,
        name: name.trim(),
        model: model ? model.trim() : null,
        total_channels: parseInt(total_channels, 10) || 8,
        notes: notes ? notes.trim() : null,
        is_active: true,
      })
      .returning('*');

    res.status(201).json(dvr);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const dvr = await db('dvr_devices').where({ id: req.params.id }).first();
    if (!dvr) return res.status(404).json({ error: 'DVR não encontrado.' });

    const client = await db('clients').where({ id: dvr.client_id }).first();
    const cameras = await db('cameras').where({ dvr_device_id: dvr.id }).orderBy('channel_number');

    res.json({
      ...dvr,
      client,
      cameras,
    });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { name, model, total_channels, notes, is_active } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (model !== undefined) updateData.model = model ? model.trim() : null;
    if (total_channels !== undefined) updateData.total_channels = parseInt(total_channels, 10);
    if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);

    const [updated] = await db('dvr_devices')
      .where({ id: req.params.id })
      .update(updateData)
      .returning('*');

    if (!updated) return res.status(404).json({ error: 'DVR não encontrado.' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    // Delete associated cameras
    await db('cameras').where({ dvr_device_id: req.params.id }).del();
    const deleted = await db('dvr_devices').where({ id: req.params.id }).del();
    if (!deleted) return res.status(404).json({ error: 'DVR não encontrado.' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
