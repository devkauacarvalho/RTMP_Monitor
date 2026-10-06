/**
 * controllers/user.controller.js
 */
const db = require('../config/database');

exports.listViewers = async (req, res, next) => {
  try {
    const viewers = await db('users').where({ role: 'viewer' }).select('id', 'username', 'full_name', 'is_active', 'created_at');
    res.json(viewers);
  } catch (err) { next(err); }
};

exports.createViewer = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'createViewer — Em implementação' });
  } catch (err) { next(err); }
};

exports.getViewer = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'getViewer — Em implementação' });
  } catch (err) { next(err); }
};

exports.updateViewer = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'updateViewer — Em implementação' });
  } catch (err) { next(err); }
};

exports.deleteViewer = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'deleteViewer — Em implementação' });
  } catch (err) { next(err); }
};

exports.changeOwnPassword = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'changeOwnPassword — Em implementação' });
  } catch (err) { next(err); }
};
