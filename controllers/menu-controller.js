// // File: controllers/menu-controller.js
const fileService = require('../services/fileService');

async function getMenu(req, res, fileName) {
  try {
    const menu = await fileService.readFile(fileName);
    res.status(200).json({ menu });
  } catch (error) {
    console.error(`[MENU-CONTROLLER] Error fetching ${fileName}:`, error);
    res.status(500).json({ error: `Failed to load ${fileName}` });
  }
}

async function getHome(req, res) {
  return getMenu(req, res, 'home.json');
}

async function getValuePack(req, res) {
  return getMenu(req, res, 'value-pack.json');
}

async function getYummy(req, res) {
  return getMenu(req, res, 'yummy.json');
}

async function getSpecial(req, res) {
  return getMenu(req, res, 'special.json');
}

async function getPromo(req, res) {
  return getMenu(req, res, 'promo.json');
}

async function getAllMenus(req, res) {
  try {
    const files = ['home.json', 'value-pack.json', 'yummy.json', 'special.json', 'promo.json'];
    const menuData = {};
    for (const file of files) {
      const category = file.replace('.json', '');
      menuData[category] = await fileService.readFile(file);
    }
    res.status(200).json(menuData);
  } catch (error) {
    console.error('[MENU-CONTROLLER] Error fetching all menus:', error);
    res.status(500).json({ error: 'Failed to load menus' });
  }
}

module.exports = {
  getHome,
  getValuePack,
  getYummy,
  getSpecial,
  getPromo,
  getAllMenus
};