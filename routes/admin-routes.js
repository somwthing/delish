//routes/admin-routes.js
const express = require('express');
const router = express.Router();
const fileService = require('../services/fileService');

// GET /admin/orders — Return all orders to admin dashboard
router.get('/orders', async (req, res) => {
  try {
    const orders = await fileService.readFile('orders.json');
    res.json(orders);
  } catch (err) {
    console.error('[ADMIN] Failed to read orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

module.exports = router;
