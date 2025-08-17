// File: routes/vendor-routes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { getCategories, getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } = require('../controllers/vendor-controller');

console.log('[ROUTES] vendor-routes initialized');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/images'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Get all categories
router.get('/categories', getCategories);

// Get items for a category
router.get('/menu/:category', getMenuItems);

// Create a new menu item in a category
router.post('/menu/:category', upload.single('image'), createMenuItem);

// Update a specific item in a category
router.put('/menu/:category/:index', upload.single('image'), updateMenuItem);

// Delete a specific item from a category
router.delete('/menu/:category/:index', deleteMenuItem);

module.exports = router;