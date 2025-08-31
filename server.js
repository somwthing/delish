/**
 * File: server.js
 * Path: / (project root)
 * Purpose: Main Express server for the Delish app.
 * - Binds to process.env.PORT (fallback 3000) and 0.0.0.0 for container networking.
 * - Ensures data directory and cart.json exist on startup.
 * - Provides debug endpoints and robust error/exit handling.
 * - Exports `app` for testing.
 *
 * Requirements satisfied:
 * - Robust error handling (try/catch, top-level handlers)
 * - Detailed logging (startup, routes, file operations)
 * - Header comments and inline comments
 */

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const cookieParser = require('cookie-parser');

// local middlewares (must exist in ./middlewares/)
const logger = require('./middlewares/logger'); // request logger
const { assignUserId } = require('./middlewares/userId'); // sets cookie userId

// route modules (must exist in ./routes/)
const menuRoutes = require('./routes/menu-routes');
const orderRoutes = require('./routes/order-routes');
const adminRoutes = require('./routes/admin-routes');
const dashboardRoutes = require('./routes/dashboard-routes');
const cartRoutes = require('./routes/cart-routes');
const vendorRoutes = require('./routes/vendor-routes');

// service helpers (must exist in ./services/)
const { readFile, writeFile } = require('./services/fileService');

const app = express();

// Use platform-provided PORT whenever possible (Coolify will inject PORT)
const port = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const CART_FILE = 'cart.json';

// ======================= Startup helpers =======================
/**
 * initializeDataFiles()
 * - ensures /data exists
 * - ensures cart.json exists and is an object (migrate from array if needed)
 */
async function initializeDataFiles() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      // readFile (service) returns parsed JSON or throws
      const cart = await readFile(CART_FILE);
      if (Array.isArray(cart)) {
        console.warn('[STARTUP] Converting cart.json from array to object');
        await writeFile(CART_FILE, {});
      }
      console.log('[STARTUP] cart.json exists and is valid');
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        console.log('[STARTUP] cart.json not found — creating a new file');
        await writeFile(CART_FILE, {});
      } else {
        // rethrow other problems so outer try catches and exits
        throw err;
      }
    }
  } catch (err) {
    console.error('[STARTUP] Initialization error:', err);
    // Fatal startup error — exit so orchestrator knows container failed
    process.exit(1);
  }
}

// ======================= Middleware =======================
app.use(logger); // Add your logger implementation (logs method, url, status)
app.use(cookieParser());
app.use(assignUserId); // ensures each user has a userId cookie

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

// Serve admin and vendor dashboards statically
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/vendor', express.static(path.join(__dirname, 'vendor')));

// ======================= Debug Endpoints =======================
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
      currentUser: req.cookies.userId || null
    });
  } catch (error) {
    res.json({
      exists: false,
      error: error && error.message ? error.message : String(error),
      currentUser: req.cookies.userId || null
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

// API & module routes
app.use('/api/menu', menuRoutes);
app.use('/api/cart', cartRoutes);
app.use('/orders', orderRoutes);
app.use('/admin', adminRoutes);
app.use('/admin', dashboardRoutes);
app.use('/vendor', vendorRoutes);

// Redirect convenience endpoints (if someone hits /admin or /vendor)
app.get('/admin', (req, res) => res.redirect('/admin/dashboard.html'));
app.get('/vendor', (req, res) => res.redirect('/vendor/vendor.html'));

// ======================= Error handlers =======================
// 404 handler
app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error(`[500] ${req.method} ${req.originalUrl}\n${err && err.stack ? err.stack : err}`);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? (err && err.message) : undefined
  });
});

// ======================= Server startup & graceful shutdown =======================
let serverInstance = null;

async function startServer() {
  await initializeDataFiles();

  // Use process.env.PORT when available; bind to 0.0.0.0 for container networking
  const actualPort = process.env.PORT || port;
  const bindAddr = '0.0.0.0';

  serverInstance = app.listen(actualPort, bindAddr, () => {
    console.log(`[SERVER] Running on http://${bindAddr}:${actualPort}`);
    console.log(`[SERVER] Data directory: ${DATA_DIR}`);
    console.log(`[SERVER] Debug endpoints:
  /debug/cart-state - View cart.json state
  /api/cart - Cart API`);
  });
}

// Graceful shutdown helper
async function shutdown(signal) {
  console.log(`[SERVER] Received ${signal} — shutting down gracefully...`);
  try {
    if (serverInstance) {
      serverInstance.close(err => {
        if (err) {
          console.error('[SERVER] Error closing server:', err);
          process.exit(1);
        }
        console.log('[SERVER] HTTP server closed.');
        process.exit(0);
      });

      // Force exit if not closed in 10s
      setTimeout(() => {
        console.warn('[SERVER] Force exit after timeout.');
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

// Top-level error handlers — ensure container exits so orchestrator can restart
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err);
  setTimeout(() => process.exit(1), 100);
});

process.on('unhandledRejection', (reason, p) => {
  console.error('[FATAL] unhandledRejection at:', p, 'reason:', reason);
  setTimeout(() => process.exit(1), 100);
});

// Handle termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
startServer().catch(err => {
  console.error('[SERVER] Failed to start:', err);
  process.exit(1);
});

// Export app for tests and tools
module.exports = app;
