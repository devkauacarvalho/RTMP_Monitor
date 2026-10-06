/**
 * controllers/client.controller.js
 */
const db = require('../config/database');

exports.list = async (req, res, next) => {
  try {
    const clients = await db('clients').select('*');
    res.json(clients);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'create client — Em implementação' });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'getOne client — Em implementação' });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'update client — Em implementação' });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'remove client — Em implementação' });
  } catch (err) { next(err); }
};
