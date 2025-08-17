// File: controllers/product-controller.js
const fileService = require('../services/fileService');
const path = require('path');
const filePath = path.join(__dirname, '../data/products.json');

exports.getProducts = async (req, res) => {
  try {
    const products = await fileService.readJSON(filePath);
    res.json(products);
  } catch (err) {
    console.error('[PRODUCT-CONTROLLER] Error reading products:', err);
    res.status(500).json({ error: 'Failed to get products' });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const products = await fileService.readJSON(filePath);
    const newProduct = req.body;
    products.push(newProduct);
    await fileService.writeJSON(filePath, products);
    console.log('[PRODUCT-CONTROLLER] Product added:', newProduct.name);
    res.status(201).json(newProduct);
  } catch (err) {
    console.error('[PRODUCT-CONTROLLER] Error adding product:', err);
    res.status(500).json({ error: 'Failed to add product' });
  }
};
