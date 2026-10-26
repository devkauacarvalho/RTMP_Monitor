/**
 * controllers/permission.controller.js
 */
const crypto = require('crypto');
const db = require('../config/database');

exports.listByViewer = async (req, res, next) => {
  try {
    const { viewerId } = req.params;
    const permissions = await db('viewer_permissions').where({ viewer_user_id: viewerId }).select('*');
    const cameras = await db('cameras').select('*');
    const dvrs = await db('dvr_devices').select('*');
    const clients = await db('clients').select('*');

    const enriched = permissions.map((p) => {
      const cam = cameras.find((c) => c.id === p.camera_id) || {};
      const dvr = dvrs.find((d) => d.id === cam.dvr_device_id) || {};
      const client = clients.find((c) => c.id === dvr.client_id) || {};
      return {
        ...p,
        camera_name: cam.name,
        channel_number: cam.channel_number,
        camera_status: cam.status,
        dvr_name: dvr.name,
        client_name: client.name,
      };
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

exports.grant = async (req, res, next) => {
  try {
    const { viewer_user_id, camera_id, camera_ids } = req.body;
    if (!viewer_user_id) {
      return res.status(400).json({ error: 'O visualizador é obrigatório.' });
    }

    // Bulk set mode: if camera_ids array is provided, replace entire permission set for this viewer
    if (Array.isArray(camera_ids)) {
      await db('viewer_permissions').where({ viewer_user_id }).del();
      const newPerms = [];
      for (const cId of camera_ids) {
        const [perm] = await db('viewer_permissions')
          .insert({
            id: crypto.randomUUID(),
            viewer_user_id,
            camera_id: cId,
            granted_by: req.user.id,
            granted_at: new Date().toISOString(),
          })
          .returning('*');
        if (perm) newPerms.push(perm);
      }
      return res.status(200).json(newPerms);
    }

    // Single grant mode
    if (!camera_id) {
      return res.status(400).json({ error: 'A câmera é obrigatória.' });
    }

    const existing = await db('viewer_permissions')
      .where({ viewer_user_id, camera_id })
      .first();

    if (existing) {
      return res.status(200).json(existing);
    }

    const [perm] = await db('viewer_permissions')
      .insert({
        id: crypto.randomUUID(),
        viewer_user_id,
        camera_id,
        granted_by: req.user.id,
        granted_at: new Date().toISOString(),
      })
      .returning('*');

    res.status(201).json(perm);
  } catch (err) {
    next(err);
  }
};

exports.revoke = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { viewer_user_id, camera_id } = req.query;

    let deleted = 0;
    if (id && id !== 'by-pair') {
      deleted = await db('viewer_permissions').where({ id }).del();
    } else if (viewer_user_id && camera_id) {
      deleted = await db('viewer_permissions').where({ viewer_user_id, camera_id }).del();
    }

    if (!deleted) {
      return res.status(404).json({ error: 'Permissão não encontrada.' });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
