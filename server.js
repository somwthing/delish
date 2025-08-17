// File: server.js
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

// Middlewares
const logger = require('./middlewares/logger');
const { assignUserId } = require('./middlewares/userId');

// Routes
const menuRoutes = require('./routes/menu-routes');
const orderRoutes = require('./routes/order-routes');
const adminRoutes = require('./routes/admin-routes');
const dashboardRoutes = require('./routes/dashboard-routes');
const cartRoutes = require('./routes/cart-routes');
const vendorRoutes = require('./routes/vendor-routes');

// Services
const { readFile, writeFile } = require('./services/fileService');

const app = express();
const port = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const CART_FILE = 'cart.json';

// ===== Startup Checks =====
async function initializeDataFiles() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Ensure cart.json exists and is an object
    try {
      const cart = await readFile(CART_FILE);
      if (Array.isArray(cart)) {
        console.warn('[STARTUP] Converting cart.json from array to object');
        await writeFile(CART_FILE, {});
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('[STARTUP] Creating initial cart.json');
        await writeFile(CART_FILE, {});
      }
    }
  } catch (error) {
    console.error('[STARTUP] Initialization error:', error);
    process.exit(1);
  }
}

// ===== Middleware =====
app.use(logger);
app.use(cookieParser());
app.use(assignUserId); // Assign or read UUID for each user

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve static admin and vendor dashboard files
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/vendor', express.static(path.join(__dirname, 'vendor')));

// ===== Debug Endpoints =====
app.get('/debug/cart-state', async (req, res) => {
  try {
    const filePath = path.join(DATA_DIR, CART_FILE);
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    
    res.json({
      exists: true,
      path: filePath,
      size: stats.size,
      lastModified: stats.mtime,
      content: content,
      parsed: safeJsonParse(content),
      currentUser: req.cookies.userId
    });
  } catch (error) {
    res.json({
      exists: false,
      error: error.message,
      currentUser: req.cookies.userId
    });
  }
});

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

// ===== Routes =====
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/api/menu', menuRoutes);
app.use('/api/cart', cartRoutes);
app.use('/orders', orderRoutes);
app.use('/admin', adminRoutes);
app.use('/admin', dashboardRoutes);
app.use('/vendor', vendorRoutes);

// Redirect /admin to dashboard
app.get('/admin', (req, res) => {
  res.redirect('/admin/dashboard.html');
});

// Redirect /vendor to vendor dashboard
app.get('/vendor', (req, res) => {
  res.redirect('/vendor/vendor.html');
});

// ===== Error Handlers =====
// 404 Handler
app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(`[500] ${req.method} ${req.originalUrl}\n${err.stack}`);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ===== Server Startup =====
async function startServer() {
  await initializeDataFiles();
  
  app.listen(port, () => {
    console.log(`[SERVER] Running on http://localhost:${port}`);
    console.log(`[SERVER] Data directory: ${DATA_DIR}`);
    console.log(`[SERVER] Debug endpoints:
  /debug/cart-state - View cart.json state
  /api/cart - Cart API`);
  });
}

startServer().catch(err => {
  console.error('[SERVER] Failed to start:', err);
  process.exit(1);
});

// Export for testing
module.exports = app;