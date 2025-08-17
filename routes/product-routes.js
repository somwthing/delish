// File: routes/product-routes.js
const express = require('express');
const router = express.Router();
const { getProducts, addProduct } = require('../controllers/product-controller');

router.get('/', getProducts);
router.post('/', addProduct);

module.exports = router;
