/**
 * controllers/permission.controller.js
 */
const db = require('../config/database');

exports.listByViewer = async (req, res, next) => {
  try {
    const permissions = await db('viewer_permissions').where({ viewer_user_id: req.params.viewerId }).select('*');
    res.json(permissions);
  } catch (err) { next(err); }
};

exports.grant = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'grant permission — Em implementação' });
  } catch (err) { next(err); }
};

exports.revoke = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'revoke permission — Em implementação' });
  } catch (err) { next(err); }
};
