// File: routes/order-routes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const orderController = require('../controllers/order-controller');
const validateOrder = require('../middlewares/validateOrder');

console.log('[ROUTES] order-routes initialized');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Form-based order submission
router.post('/submit', upload.single('paymentImage'), validateOrder, (req, res, next) => {
  console.log('[ROUTES] Hit POST /orders/submit');
  return orderController.submitOrder(req, res, next);
});

// Place order directly from cart.json
router.post('/from-cart', (req, res, next) => {
  console.log('[ROUTES] Hit POST /orders/from-cart');
  return orderController.placeOrderFromCart(req, res, next);
});

// Attach details (modal) to an existing order
// POST /orders/:orderId/details
router.post('/:orderId/details', upload.single('paymentImage'), (req, res, next) => {
  console.log(`[ROUTES] Hit POST /orders/${req.params.orderId}/details`);
  return orderController.attachOrderDetails(req, res, next);
});

// Update order status
router.patch('/:orderId/status', (req, res, next) => {
  console.log(`[ROUTES] Hit PATCH /orders/${req.params.orderId}/status`);
  return orderController.updateOrderStatus(req, res, next);
});

module.exports = router;
