// routes/cart-routes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart-controller');

router.get('/', cartController.getCart);
router.post('/', cartController.addCartItem);
router.put('/:itemId', cartController.updateCartItem);
router.delete('/:itemId', cartController.removeCartItem);
router.post('/clear', cartController.clearCart);

module.exports = router;
