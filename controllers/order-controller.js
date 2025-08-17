// File: controllers/order-controller.js
const fs = require('fs').promises;
const path = require('path');
const fileService = require('../services/fileService');
const generateId = require('../utils/generateId');

const ordersFilePath = path.join(__dirname, '../data/orders.json');
const MENU_FILES = ['home.json', 'value-pack.json', 'yummy.json', 'special.json', 'promo.json'];

async function findMenuItem(itemId) {
  for (const file of MENU_FILES) {
    const menu = await fileService.readFile(file);
    const item = Array.isArray(menu) ? menu.find(m => m.id === itemId) : null;
    if (item) return item;
  }
  return null;
}

async function submitOrder(req, res) {
  try {
    const {
      userId,
      items,
      total,
      clientName,
      clientContact,
      clientEmail,
      clientAddress,
      clientBuilding,
      clientFloor,
    } = req.body;

    console.log('[ORDER] Raw order received:', {
      userId,
      items,
      total,
      clientName,
      clientContact,
      clientEmail,
      clientAddress,
      clientBuilding,
      clientFloor,
      paymentImage: req.file ? req.file.filename : 'none',
    });

    if (
      !userId ||
      !items ||
      !total ||
      !clientName ||
      !clientContact ||
      !clientEmail ||
      !clientAddress ||
      !clientBuilding ||
      !clientFloor
    ) {
      console.log('[ORDER] Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let parsedItems;
    try {
      parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    } catch (err) {
      console.log('[ORDER] Failed to parse items JSON:', err.message);
      return res.status(400).json({ error: 'Invalid items JSON format' });
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      return res.status(400).json({ error: 'Items must be a non-empty array' });
    }

    const validItems = [];
    for (const item of parsedItems) {
      const menuItem = await findMenuItem(item.itemId);
      if (menuItem && menuItem.name === item.name && Number(menuItem.price) === Number(item.price) && item.quantity > 0) {
        validItems.push(item);
      }
    }

    if (validItems.length !== parsedItems.length) {
      return res.status(400).json({ error: 'Some items are invalid or do not match the menu' });
    }

    const serverTotal = validItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const clientTotal = parseFloat(total);
    if (isNaN(clientTotal)) {
      return res.status(400).json({ error: 'Invalid total format' });
    }
    if (Math.abs(serverTotal - clientTotal) > 0.01) {
      return res.status(400).json({
        error: `Total mismatch: server ${serverTotal.toFixed(2)}, client ${clientTotal.toFixed(2)}`,
      });
    }

    let orders = await fileService.readFile('orders.json').catch(() => []);
    if (!Array.isArray(orders)) orders = [];

    let orderId;
    do {
      orderId = generateId();
    } while (orders.some((o) => o.orderId === orderId));

    let paymentImagePath = null;
    if (req.file) {
      const filename = req.file.filename || (req.file.path && path.basename(req.file.path));
      if (filename) paymentImagePath = `/uploads/${filename}`;
    }

    const order = {
      orderId,
      userId,
      clientName,
      clientContact,
      clientEmail,
      clientAddress,
      clientBuilding,
      clientFloor,
      items: validItems,
      total: serverTotal,
      paymentImage: paymentImagePath,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    orders.push(order);
    await fileService.writeFile('orders.json', orders);

    console.log('[ORDER] Order saved successfully:', orderId);
    res.status(201).json({ message: 'Order placed successfully', orderId, total: serverTotal });
  } catch (error) {
    console.error('[ORDER] Submission error:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
}

async function placeOrderFromCart(req, res) {
  const userId = req.body.userId || req.cookies.userId;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  try {
    const allCarts = await fileService.readFile('cart.json') || {};
    const userCart = allCarts[userId] || [];

    if (!Array.isArray(userCart) || userCart.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    let orders = await fileService.readFile('orders.json').catch(() => []);
    if (!Array.isArray(orders)) orders = [];

    const orderId = generateId();
    const total = userCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const newOrder = {
      orderId,
      userId,
      items: userCart,
      total,
      timestamp: new Date().toISOString(),
      status: "pending"
    };

    orders.push(newOrder);
    await fileService.writeFile('orders.json', orders);
    allCarts[userId] = [];
    await fileService.writeFile('cart.json', allCarts);

    console.log("[ORDER] Order placed from cart:", newOrder);
    res.status(201).json({ message: "Order placed from cart", orderId, total });
  } catch (err) {
    console.error("[ORDER] placeOrderFromCart error:", err);
    res.status(500).json({ error: "Failed to place order from cart" });
  }
}

async function attachOrderDetails(req, res) {
  try {
    const { orderId } = req.params;
    if (!orderId) return res.status(400).json({ error: "Order ID required" });

    let orders = await fileService.readFile('orders.json').catch(() => []);
    if (!Array.isArray(orders)) orders = [];

    const idx = orders.findIndex((o) => o.orderId === orderId);
    if (idx === -1) {
      return res.status(404).json({ error: `Order ${orderId} not found` });
    }

    const targetOrder = orders[idx];

    const clientUserId = req.body.userId;
    if (clientUserId && targetOrder.userId && clientUserId !== targetOrder.userId) {
      console.warn(`[ORDER] attach details userId mismatch: ${clientUserId} !== ${targetOrder.userId}`);
    }

    const required = ['clientName', 'clientContact', 'clientEmail', 'clientAddress', 'clientBuilding', 'clientFloor'];
    for (const r of required) {
      if (!req.body[r]) {
        return res.status(400).json({ error: `Missing required field: ${r}` });
      }
    }

    let paymentImagePath = targetOrder.paymentImage || null;
    if (req.file) {
      const filename = req.file.filename || (req.file.path && path.basename(req.file.path));
      if (filename) paymentImagePath = `/uploads/${filename}`;
    }

    orders[idx] = {
      ...targetOrder,
      clientName: req.body.clientName,
      clientContact: req.body.clientContact,
      clientEmail: req.body.clientEmail,
      clientAddress: req.body.clientAddress,
      clientBuilding: req.body.clientBuilding,
      clientFloor: req.body.clientFloor,
      paymentImage: paymentImagePath,
      updatedAt: new Date().toISOString()
    };

    await fileService.writeFile('orders.json', orders);

    console.log(`[ORDER] Attach details saved for order ${orderId}`);
    res.json({ message: "Order details attached", orderId });
  } catch (err) {
    console.error('[ORDER] attachOrderDetails error:', err);
    res.status(500).json({ error: 'Failed to attach order details' });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ error: 'Order ID and status are required' });
    }
    if (!['pending', 'confirmed', 'delivered', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    let orders = [];
    try {
      orders = await fileService.readFile('orders.json');
    } catch (error) {
      return res.status(500).json({ error: 'Failed to read orders' });
    }

    const idx = orders.findIndex((o) => o.orderId === orderId);
    if (idx === -1) {
      return res.status(404).json({ error: `Order ${orderId} not found` });
    }

    orders[idx] = {
      ...orders[idx],
      status,
      updatedAt: new Date().toISOString(),
    };

    await fileService.writeFile('orders.json', orders);
    res.json({ message: 'Order status updated', order: orders[idx] });
  } catch (error) {
    console.error('[ORDER] Failed to update order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
}

module.exports = {
  submitOrder,
  placeOrderFromCart,
  attachOrderDetails,
  updateOrderStatus
};