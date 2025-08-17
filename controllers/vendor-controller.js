// File: controllers/vendor-controller.js
const { readJsonFile, writeJsonFile, listJsonFiles } = require('../services/fileService');
const path = require('path');

async function getCategories(req, res) {
  try {
    const categories = await listJsonFiles();
    console.log('[VENDOR] Fetched categories:', categories.length);
    res.json(categories);
  } catch (error) {
    console.error('[VENDOR] Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

async function getMenuItems(req, res) {
  try {
    const { category } = req.params;
    const items = (await readJsonFile(`${category}.json`)) || [];
    console.log('[VENDOR] Fetched items for category:', category, 'count:', items.length);
    res.json(items);
  } catch (error) {
    console.error('[VENDOR] Error fetching menu items:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
}

async function createMenuItem(req, res) {
  try {
    const { id, name, price, description } = req.body;
    const image = req.file;

    if (!id || !name || !price || !description || !image) {
      console.log('[VENDOR] Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: id, name, price, description, image' });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    const filename = `${id}.json`;
    let items = (await readJsonFile(filename)) || [];
    if (!Array.isArray(items)) items = [];

    const imagePath = `/images/${image.filename}`;
    const newItem = {
      id,
      name,
      price: parseFloat(price),
      image: imagePath,
      description
    };

    items.push(newItem);
    await writeJsonFile(filename, items);

    console.log('[VENDOR] Added item to category:', id);
    res.status(201).json({ message: 'Item added to category', item: newItem });
  } catch (error) {
    console.error('[VENDOR] Error creating menu item:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
}

async function updateMenuItem(req, res) {
  try {
    const { category, index } = req.params;
    const { id, name, price, description } = req.body;
    const image = req.file;

    if (!id || !name || !price || !description) {
      console.log('[VENDOR] Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: id, name, price, description' });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    if (isNaN(index)) {
      return res.status(400).json({ error: 'Invalid item index' });
    }

    const filename = `${category}.json`;
    let items = (await readJsonFile(filename)) || [];
    if (!Array.isArray(items)) items = [];

    const itemIndex = parseInt(index);
    if (!items[itemIndex]) {
      return res.status(404).json({ error: `Item ${itemIndex} not found in category ${category}` });
    }

    const imagePath = image ? `/images/${image.filename}` : items[itemIndex].image;

    items[itemIndex] = {
      id,
      name,
      price: parseFloat(price),
      image: imagePath,
      description
    };

    await writeJsonFile(filename, items);

    console.log('[VENDOR] Updated item in category:', category, 'index:', itemIndex);
    res.json({ message: 'Item updated', item: items[itemIndex] });
  } catch (error) {
    console.error('[VENDOR] Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
}

async function deleteMenuItem(req, res) {
  try {
    const { category, index } = req.params;

    if (isNaN(index)) {
      return res.status(400).json({ error: 'Invalid item index' });
    }

    const filename = `${category}.json`;
    let items = (await readJsonFile(filename)) || [];
    if (!Array.isArray(items)) items = [];

    const itemIndex = parseInt(index);
    if (!items[itemIndex]) {
      return res.status(404).json({ error: `Item ${itemIndex} not found in category ${category}` });
    }

    const deletedItem = items.splice(itemIndex, 1)[0];
    await writeJsonFile(filename, items);

    console.log('[VENDOR] Deleted item from category:', category, 'index:', itemIndex);
    res.json({ message: 'Item deleted', item: deletedItem });
  } catch (error) {
    console.error('[VENDOR] Error deleting menu item:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
}

module.exports = {
  getCategories,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
};