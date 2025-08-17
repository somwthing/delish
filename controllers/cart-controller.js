// File: controllers/cart-controller.js
// Handles cart operations against data/cart.json
const path = require('path');
const fileService = require('../services/fileService');

const CART_FILE = 'cart.json';
const MENU_FILES = ['home.json', 'value-pack.json', 'yummy.json', 'special.json', 'promo.json'];

async function findMenuItem(itemId) {
  for (const file of MENU_FILES) {
    const menu = await fileService.readFile(file);
    const item = Array.isArray(menu) ? menu.find(m => m.id === itemId) : null;
    if (item) return item;
  }
  return null;
}

function resolveUserId(req) {
  return (req.body && req.body.userId) || (req.query && req.query.userId) || req.userId || 'guest';
}

async function getUserCartData(userId) {
  const allCarts = await fileService.readFile(CART_FILE).catch(() => ({}));
  if (!allCarts || typeof allCarts !== 'object') {
    return { allCarts: {}, userCart: [] };
  }
  if (!Array.isArray(allCarts[userId])) {
    allCarts[userId] = [];
  }
  return { allCarts, userCart: allCarts[userId] };
}

async function getCart(req, res) {
  try {
    const userId = resolveUserId(req);
    console.log('[CART_CONTROLLER] GET cart for user:', userId);
    const { userCart } = await getUserCartData(userId);
    res.json(userCart);
  } catch (err) {
    console.error('[CART_CONTROLLER] Error getting cart:', err);
    res.status(500).json({ message: 'Failed to get cart' });
  }
}

async function addCartItem(req, res) {
  try {
    const { itemId, quantity } = req.body;
    const userId = resolveUserId(req);
    if (!itemId || quantity == null) {
      return res.status(400).json({ message: 'Item ID and quantity are required' });
    }
    const menuItem = await findMenuItem(itemId);
    if (!menuItem) return res.status(400).json({ message: 'Invalid item ID' });
    if (quantity <= 0 || quantity > 50) return res.status(400).json({ message: 'Invalid quantity' });

    const { allCarts, userCart } = await getUserCartData(userId);
    const existing = userCart.find(c => c.itemId === itemId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      userCart.push({ itemId, name: menuItem.name, price: menuItem.price, quantity });
    }
    allCarts[userId] = userCart;
    await fileService.writeFile(CART_FILE, allCarts);
    console.log('[CART_CONTROLLER] Added item to cart for', userId, 'cart now:', userCart);
    res.json(userCart);
  } catch (err) {
    console.error('[CART_CONTROLLER] Error adding to cart:', err);
    res.status(500).json({ message: 'Failed to add to cart' });
  }
}

async function updateCartItem(req, res) {
  try {
    const userId = resolveUserId(req);
    const { itemId } = req.params;
    const { quantity } = req.body;
    if (quantity == null) return res.status(400).json({ message: 'Quantity is required' });

    const menuItem = await findMenuItem(itemId);
    if (!menuItem) return res.status(400).json({ message: 'Invalid item ID' });

    const { allCarts, userCart } = await getUserCartData(userId);
    const index = userCart.findIndex(c => c.itemId === itemId);

    if (quantity <= 0) {
      if (index !== -1) userCart.splice(index, 1);
    } else {
      if (quantity > 50) return res.status(400).json({ message: 'Quantity exceeds limit' });
      if (index !== -1) {
        userCart[index].quantity = quantity;
      } else {
        userCart.push({ itemId, name: menuItem.name, price: menuItem.price, quantity });
      }
    }

    allCarts[userId] = userCart;
    await fileService.writeFile(CART_FILE, allCarts);
    console.log('[CART_CONTROLLER] Updated cart for', userId, userCart);
    res.json(userCart);
  } catch (err) {
    console.error('[CART_CONTROLLER] Error updating cart item:', err);
    res.status(500).json({ message: 'Failed to update cart item' });
  }
}

async function removeCartItem(req, res) {
  try {
    const userId = resolveUserId(req);
    const { itemId } = req.params;
    const { allCarts, userCart } = await getUserCartData(userId);
    const updatedCart = userCart.filter(c => c.itemId !== itemId);
    allCarts[userId] = updatedCart;
    await fileService.writeFile(CART_FILE, allCarts);
    console.log('[CART_CONTROLLER] Removed item for', userId, 'updated:', updatedCart);
    res.json(updatedCart);
  } catch (err) {
    console.error('[CART_CONTROLLER] Error removing cart item:', err);
    res.status(500).json({ message: 'Failed to remove cart item' });
  }
}

async function clearCart(req, res) {
  try {
    const userId = resolveUserId(req);
    const allCarts = await fileService.readFile(CART_FILE).catch(() => ({}));
    allCarts[userId] = [];
    await fileService.writeFile(CART_FILE, allCarts);
    console.log('[CART_CONTROLLER] Cleared cart for user:', userId);
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    console.error('[CART_CONTROLLER] Error clearing cart:', err);
    res.status(500).json({ message: 'Failed to clear cart' });
  }
}

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart
};