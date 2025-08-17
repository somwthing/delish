//routes\dashboard-routes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard-controller');

// GET /admin/dashboard
router.get('/dashboard', dashboardController.getDashboardData);

module.exports = router;