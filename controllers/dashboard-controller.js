//controllers\dashboard-controller.js
const fileService = require('../services/fileService');

async function getDashboardData(req, res) {
  try {
    // Fetch all orders from orders.json
    const orders = await fileService.readFile('orders.json').catch(() => []);
    
    // Calculate basic stats
    const stats = {
      totalOrders: orders.length,
      pendingOrders: orders.filter(order => order.status === 'pending').length,
      completedOrders: orders.filter(order => order.status === 'completed').length,
      totalRevenue: orders.reduce((sum, order) => sum + order.total, 0)
    };

    console.log('[DASHBOARD] Fetched dashboard data:', stats);
    res.json({ orders, stats });
  } catch (error) {
    console.error('[DASHBOARD] Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}

module.exports = { getDashboardData };