// File: middlewares/userId.js
const { randomUUID } = require('crypto');

function assignUserId(req, res, next) {
  if (!req.cookies.userId) {
    const id = randomUUID();
    res.cookie('userId', id, { maxAge: 1000 * 60 * 60 * 24 * 30, httpOnly: true });
    req.userId = id;
  } else {
    req.userId = req.cookies.userId;
  }
  next();
}

module.exports = { assignUserId };
