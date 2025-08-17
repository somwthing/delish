// File: middlewares/logger.js
const logger = (req, res, next) => {
  console.log(`[LOGGER] ${req.method} ${req.url}`);
  next();
};

module.exports = logger;
