/**
 * controllers/settings.controller.js
 */
const db = require('../config/database');

exports.get = async (req, res, next) => {
  try {
    const settings = await db('server_settings').where({ id: 1 }).first();
    res.json(settings);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'update settings — Em implementação' });
  } catch (err) { next(err); }
};
