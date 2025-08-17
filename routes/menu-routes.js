// File: routes/menu-routes.js
const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menu-controller');

router.get('/home', menuController.getHome);
router.get('/value-pack', menuController.getValuePack);
router.get('/yummy', menuController.getYummy);
router.get('/special', menuController.getSpecial);
router.get('/promo', menuController.getPromo);
router.get('/', menuController.getAllMenus);

module.exports = router;