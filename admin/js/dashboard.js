// File: admin/js/dashboard.js

let allOrders = [];

async function fetchDashboardData() {
  try {
    const res = await fetch('/admin/dashboard');
    if (!res.ok) throw new Error(`Failed to fetch dashboard data: ${res.status}`);
    const { orders, stats } = await res.json();
    allOrders = orders;
    updateStats(stats);
    renderOrders(orders);
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    showToast('Failed to load dashboard data', 'error');
  }
}

function updateStats(stats) {
  const statsContainer = document.getElementById('stats-container');
  if (!statsContainer) return;

  statsContainer.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${stats.totalOrders}</div>
      <div class="stat-label">Total Orders</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.pendingOrders}</div>
      <div class="stat-label">Pending</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.completedOrders}</div>
      <div class="stat-label">Completed</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">Rp ${Number(stats.totalRevenue || 0).toLocaleString()}</div>
      <div class="stat-label">Revenue</div>
    </div>
  `;
}

function renderOrders(orders) {
  const container = document.getElementById('orders-container');
  const loader = document.querySelector('.loading-spinner');
  if (!container) return;

  container.innerHTML = '';
  if (loader) loader.style.display = 'none';

  if (orders.length === 0) {
    container.innerHTML = `<div class="empty-state">No orders found</div>`;
    return;
  }

  orders.forEach(order => {
    const card = document.createElement('div');
    card.className = 'order-card';

    const orderTotal = Number(order.total || 0).toLocaleString();
    const createdAt = order.createdAt || order.timestamp || null;
    const formattedDate = createdAt ? new Date(createdAt).toLocaleString() : 'N/A';

    card.innerHTML = `
      <div class="order-header" onclick="this.parentElement.classList.toggle('expanded')">
        <div class="order-id">#${order.orderId}</div>
        <div class="order-status ${order.status === 'pending' ? 'status-pending' : 'status-completed'}">
          ${order.status}
        </div>
        <div class="order-price">Rp ${orderTotal}</div>
      </div>
      <div class="order-content">
        <div class="order-details">
          <div class="order-detail"><strong>Name:</strong> ${order.clientName || 'N/A'}</div>
          <div class="order-detail"><strong>Email:</strong> ${order.clientEmail || 'N/A'}</div>
          <div class="order-detail"><strong>Phone:</strong> ${order.clientContact || order.clientPhone || 'N/A'}</div>
          <div class="order-detail"><strong>Address:</strong> ${order.clientAddress || 'N/A'}</div>
          <div class="order-detail"><strong>Building:</strong> ${order.clientBuilding || 'N/A'}</div>
          <div class="order-detail"><strong>Floor:</strong> ${order.clientFloor || 'N/A'}</div>
        </div>
        <div class="order-items">
          <div class="order-items-title">Items:</div>
          ${(order.items || []).map(item => `
            <div class="order-item">
              <span>${item.name} × ${item.quantity}</span>
              <span>Rp ${Number(item.price * item.quantity || 0).toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
        <div class="order-timestamp">${formattedDate}</div>
        <div class="action-buttons">
          ${order.status === 'pending' ? `
            <button class="btn btn-primary" onclick="updateOrderStatus('${order.orderId}', 'completed')">
              Mark Completed
            </button>
          ` : ''}
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    if (!orderId || orderId.startsWith('temp-')) throw new Error('Cannot update temporary orders');

    const res = await fetch(`/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, updatedAt: new Date().toISOString() })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update order: ${res.status}`);
    }

    allOrders = allOrders.map(order =>
      order.orderId === orderId ? { ...order, status: newStatus, updatedAt: new Date().toISOString() } : order
    );

    updateStats({
      totalOrders: allOrders.length,
      pendingOrders: allOrders.filter(o => o.status === 'pending').length,
      completedOrders: allOrders.filter(o => o.status === 'completed').length,
      totalRevenue: allOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
    });

    renderOrders(allOrders);
    showToast(`Order #${orderId} marked as ${newStatus}`, 'success');
  } catch (err) {
    console.error('Error updating order:', err);
    showToast(err.message || 'Failed to update order status', 'error');
  }
}

function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

document.getElementById('refresh-btn')?.addEventListener('click', () => {
  const loader = document.querySelector('.loading-spinner');
  if (loader) loader.style.display = 'flex';
  fetchDashboardData();
});

document.addEventListener('DOMContentLoaded', () => {
  fetchDashboardData();
});