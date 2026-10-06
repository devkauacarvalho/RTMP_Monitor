/**
 * controllers/dvr.controller.js
 */
const db = require('../config/database');

exports.list = async (req, res, next) => {
  try {
    const dvrs = await db('dvr_devices').select('*');
    res.json(dvrs);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'create DVR — Em implementação' });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'getOne DVR — Em implementação' });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'update DVR — Em implementação' });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    res.status(501).json({ message: 'remove DVR — Em implementação' });
  } catch (err) { next(err); }
};
