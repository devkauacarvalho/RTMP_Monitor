/**
 * controllers/user.controller.js
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

exports.listViewers = async (req, res, next) => {
  try {
    const viewers = await db('users')
      .where({ role: 'viewer' })
      .select('id', 'username', 'full_name', 'is_active', 'created_at');

    const permissions = await db('viewer_permissions').select('*');

    const enriched = viewers.map((v) => {
      const perms = permissions.filter((p) => p.viewer_user_id === v.id);
      return {
        ...v,
        permissions_count: perms.length,
      };
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

exports.createViewer = async (req, res, next) => {
  try {
    const { username, password, full_name } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Nome de usuário é obrigatório.' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 4 caracteres.' });
    }
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Nome completo é obrigatório.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await db('users').where({ username: cleanUsername }).first();
    if (existing) {
      return res.status(409).json({ error: 'Já existe um usuário cadastrado com este login.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [viewer] = await db('users')
      .insert({
        id: crypto.randomUUID(),
        username: cleanUsername,
        password_hash,
        full_name: full_name.trim(),
        role: 'viewer',
        is_active: true,
        created_by: req.user.id,
      })
      .returning('*');

    res.status(201).json({
      id: viewer.id,
      username: viewer.username,
      full_name: viewer.full_name,
      role: viewer.role,
      is_active: viewer.is_active,
      created_at: viewer.created_at,
    });
  } catch (err) {
    next(err);
  }
};

exports.getViewer = async (req, res, next) => {
  try {
    const viewer = await db('users').where({ id: req.params.id, role: 'viewer' }).first();
    if (!viewer) return res.status(404).json({ error: 'Visualizador não encontrado.' });

    const permissions = await db('viewer_permissions').where({ viewer_user_id: viewer.id }).select('*');
    const cameraIds = permissions.map((p) => p.camera_id);
    const allCameras = await db('cameras').select('*');
    const grantedCameras = allCameras.filter((c) => cameraIds.includes(c.id));

    res.json({
      id: viewer.id,
      username: viewer.username,
      full_name: viewer.full_name,
      role: viewer.role,
      is_active: viewer.is_active,
      created_at: viewer.created_at,
      permissions: grantedCameras,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateViewer = async (req, res, next) => {
  try {
    const { full_name, password, is_active } = req.body;
    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name.trim();
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);
    if (password && password.trim().length >= 4) {
      updateData.password_hash = await bcrypt.hash(password.trim(), 10);
    }

    const [updated] = await db('users')
      .where({ id: req.params.id, role: 'viewer' })
      .update(updateData)
      .returning('*');

    if (!updated) return res.status(404).json({ error: 'Visualizador não encontrado.' });

    res.json({
      id: updated.id,
      username: updated.username,
      full_name: updated.full_name,
      role: updated.role,
      is_active: updated.is_active,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteViewer = async (req, res, next) => {
  try {
    // Delete permissions
    await db('viewer_permissions').where({ viewer_user_id: req.params.id }).del();
    const deleted = await db('users').where({ id: req.params.id, role: 'viewer' }).del();
    if (!deleted) return res.status(404).json({ error: 'Visualizador não encontrado.' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.changeOwnPassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password || new_password.length < 4) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 4 caracteres.' });
    }

    const user = await db('users').where({ id: req.user.id }).first();
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Senha atual incorreta.' });

    const password_hash = await bcrypt.hash(new_password, 10);
    await db('users').where({ id: user.id }).update({ password_hash });

    res.json({ message: 'Senha alterada com sucesso.' });
  } catch (err) {
    next(err);
  }
};
