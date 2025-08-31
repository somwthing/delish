// File: server.js
// Purpose: Main Express server for the Delish app.
// - Binds to 0.0.0.0 so container networking works correctly
// - Ensures data dir & cart.json exist on startup
// - Provides debug endpoints and robust error/exit handling
// - Exports `app` for testing

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');

// Middlewares (keep your existing implementations)
const logger = require('./middlewares/logger');
const { assignUserId } = require('./middlewares/userId');

// Routes (keep your existing route files)
const menuRoutes = require('./routes/menu-routes');
const orderRoutes = require('./routes/order-routes');
const adminRoutes = require('./routes/admin-routes');
const dashboardRoutes = require('./routes/dashboard-routes');
const cartRoutes = require('./routes/cart-routes');
const vendorRoutes = require('./routes/vendor-routes');

// Services (file read/write helpers)
const { readFile, writeFile } = require('./services/fileService');

const app = express();

// NOTE: `port` default uses process.env.PORT if provided by platform (Coolify)
const port = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const CART_FILE = 'cart.json';

// ======================= Startup helpers =======================
/**
 * Ensure data directory and cart.json exist.
 * - If cart.json is an array, convert it to an object (legacy handling).
 * - On fatal error, exit with non-zero code.
 */
async function initializeDataFiles() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });

    try {
      const cart = await readFile(CART_FILE);
      if (Array.isArray(cart)) {
        console.warn('[STARTUP] Converting cart.json from array to object');
        await writeFile(CART_FILE, {});
      }
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        console.log('[STARTUP] Creating initial cart.json');
        await writeFile(CART_FILE, {});
      } else {
        // If readFile threw a different error, surface it
        throw error;
      }
    }
  } catch (error) {
    console.error('[STARTUP] Initialization error:', error);
    // If initialization fails, we should not continue running
    process.exit(1);
  }
}

// ======================= Middleware =======================
app.use(logger); // request logging middleware (your implementation)
app.use(cookieParser());
app.use(assignUserId); // sets/reads UUID cookie for users

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve public assets
app.use(express.static(path.join(__dirname, 'public')));

// Serve static admin and vendor dashboard files (still served by Express)
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/vendor', express.static(path.join(__dirname, 'vendor')));

// ======================= Debug Endpoints =======================
/**
 * GET /debug/cart-state
 * Returns metadata and content for cart.json (useful for debugging in container)
 */
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

// ======================= Application Routes =======================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use('/api/menu', menuRoutes);
app.use('/api/cart', cartRoutes);
app.use('/orders', orderRoutes);
app.use('/admin', adminRoutes);
app.use('/admin', dashboardRoutes);
app.use('/vendor', vendorRoutes);

// Redirect convenience routes
app.get('/admin', (req, res) => res.redirect('/admin/dashboard.html'));
app.get('/vendor', (req, res) => res.redirect('/vendor/vendor.html'));

// ======================= Error handlers =======================
// 404 handler (log then respond)
app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// General error handler (logs stack; returns generic message in production)
app.use((err, req, res, next) => {
  console.error(`[500] ${req.method} ${req.originalUrl}\n${err.stack}`);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ======================= Server startup & shutdown =======================
let serverInstance = null;

async function startServer() {
  await initializeDataFiles();

  const bindAddr = '0.0.0.0'; // bind to all interfaces so container accepts external connections

  // Start server and keep instance so we can close gracefully
  serverInstance = app.listen(port, bindAddr, () => {
    console.log(`[SERVER] Running on http://${bindAddr}:${port}`);
    console.log(`[SERVER] Data directory: ${DATA_DIR}`);
    console.log(`[SERVER] Debug endpoints:
  /debug/cart-state - View cart.json state
  /api/cart - Cart API`);
  });
}

// Graceful shutdown helpers
async function shutdown(signal) {
  console.log(`[SERVER] Received ${signal} - shutting down gracefully...`);
  try {
    if (serverInstance) {
      // stop accepting new connections, wait up to 10s for existing
      serverInstance.close(err => {
        if (err) {
          console.error('[SERVER] Error closing server:', err);
          process.exit(1);
        }
        console.log('[SERVER] HTTP server closed.');
        process.exit(0);
      });

      // Force exit after timeout if server doesn't close
      setTimeout(() => {
        console.warn('[SERVER] Forcing shutdown after timeout.');
        process.exit(1);
      }, 10000).unref();
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('[SERVER] Shutdown error:', err);
    process.exit(1);
  }
}

// Top-level error handlers so container exits on unhandled errors (visible in logs)
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err);
  // give logs a moment then exit
  setTimeout(() => process.exit(1), 100);
});

process.on('unhandledRejection', (reason, p) => {
  console.error('[FATAL] unhandledRejection at Promise', p, 'reason:', reason);
  setTimeout(() => process.exit(1), 100);
});

// Listen for termination signals from orchestrator (Coolify / Docker)
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start the server
startServer().catch(err => {
  console.error('[SERVER] Failed to start:', err);
  process.exit(1);
});

// Export app so tests or other modules can require it
module.exports = app;
