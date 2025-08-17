// File: controllers/user-controller.js
const path = require('path');
const fileService = require('../services/fileService');
const filePath = path.join(__dirname, '../data/users.json');

exports.getUsers = async (req, res) => {
  try {
    const users = await fileService.readJSON(filePath);
    res.json(users);
  } catch (err) {
    console.error('[USER-CONTROLLER] Error reading users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
