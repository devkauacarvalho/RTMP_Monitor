/**
 * controllers/client.controller.js
 */
const crypto = require('crypto');
const db = require('../config/database');

exports.list = async (req, res, next) => {
  try {
    const clients = await db('clients').select('*');
    const dvrs = await db('dvr_devices').select('*');
    const cameras = await db('cameras').select('*');

    // Enrich clients with attached DVR and camera counts
    const enriched = clients.map((client) => {
      const clientDvrs = dvrs.filter((d) => d.client_id === client.id);
      const dvrIds = clientDvrs.map((d) => d.id);
      const clientCameras = cameras.filter((c) => dvrIds.includes(c.dvr_device_id));
      return {
        ...client,
        dvr_count: clientDvrs.length,
        camera_count: clientCameras.length,
      };
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome do cliente é obrigatório.' });
    }

    const [client] = await db('clients')
      .insert({
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description ? description.trim() : null,
        is_active: true,
        created_by: req.user.id,
      })
      .returning('*');

    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const client = await db('clients').where({ id: req.params.id }).first();
    if (!client) return res.status(404).json({ error: 'Cliente não encontrado.' });

    const dvrs = await db('dvr_devices').where({ client_id: client.id }).select('*');
    const dvrIds = dvrs.map((d) => d.id);
    const cameras = (await db('cameras').select('*')).filter((c) => dvrIds.includes(c.dvr_device_id));

    res.json({
      ...client,
      dvrs,
      cameras,
    });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { name, description, is_active } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);

    const [updated] = await db('clients')
      .where({ id: req.params.id })
      .update(updateData)
      .returning('*');

    if (!updated) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    // Delete associated DVRs and cameras (cascade)
    const dvrs = await db('dvr_devices').where({ client_id: req.params.id }).select('id');
    for (const d of dvrs) {
      await db('cameras').where({ dvr_device_id: d.id }).del();
    }
    await db('dvr_devices').where({ client_id: req.params.id }).del();

    const deleted = await db('clients').where({ id: req.params.id }).del();
    if (!deleted) return res.status(404).json({ error: 'Cliente não encontrado.' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
