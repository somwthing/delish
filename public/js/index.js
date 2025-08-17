// File: public/js/index.js
import { fetchMenuData, renderMenu, initSquares } from "./menu.js";
import { 
  addToCart, 
  validateQuantityInput, 
  updateTotalBill, 
  getCartItems, 
  calculateTotal,
  updateCartItemQuantity,
  fetchCartData,
  syncCartWithUI
} from "./cart.js";
import { openOrderModal } from "./order.js";
import { setupImageModal } from "./modal.js";

function sanitizeId(id) {
  return id.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
}

let menuCache = [];

function updateOrderSummary(orderNo, orderCost, cartItems, isExpanded) {
  const cartItemsData = getCartItems();
  const total = calculateTotal();
  orderNo.textContent = `Items: ${cartItemsData.length}`;
  orderCost.textContent = `Total: ${formatRupiah(total)}`;
  if (isExpanded) {
    cartItems.innerHTML = cartItemsData
      .map(item => `<div>${item.name} - ${formatRupiah(item.price)} x ${item.quantity}</div>`)
      .join('');
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log('[INDEX] DOMContentLoaded: Initializing application...');

  if (!localStorage.getItem("userId")) {
    const newId = crypto.randomUUID();
    localStorage.setItem("userId", newId);
    console.log("[INDEX] Assigned new userId:", newId);
  } else {
    console.log("[INDEX] Existing userId:", localStorage.getItem("userId"));
  }

  menuCache = await fetchMenuData();
  console.log('[INDEX] Menu cache loaded:', menuCache.length, 'items');

  await fetchCartData();
  syncCartWithUI();
  renderMenu(menuCache, (item) => addToCart(item));
  updateTotalBill();
  setupImageModal();
  initSquares();
  initEventListeners();
  initOrderSummary();
});

function initEventListeners() {
  console.log('[INDEX] Setting up event listeners...');

  document.getElementById("order-btn")?.addEventListener("click", handleCartOrder);
  document.getElementById("order-process")?.addEventListener("click", handleCartOrder);

  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add-to-cart-btn");
    const incrementBtn = e.target.closest(".qty-increment");
    const decrementBtn = e.target.closest(".qty-decrement");

    if (addBtn) {
      console.log('[INDEX] Add to cart button clicked:', addBtn.dataset.itemId);
      handleAddToCart(addBtn);
    }
    if (incrementBtn) {
      console.log('[INDEX] Increment button clicked:', incrementBtn.dataset.itemId);
      handleQuantityChange(incrementBtn, 1);
    }
    if (decrementBtn) {
      console.log('[INDEX] Decrement button clicked:', decrementBtn.dataset.itemId);
      handleQuantityChange(decrementBtn, -1);
    }
  });
}

function handleAddToCart(button) {
  const itemId = button.dataset.itemId;
  console.log('[INDEX] Handling add to cart for item:', itemId);
  const item = menuCache.find((i) => i.id === itemId);
  if (item) {
    addToCart(item);
    updateTotalBill();
    const orderNo = document.getElementById('order-list-no');
    const orderCost = document.getElementById('order-list-cost');
    const cartItems = document.getElementById('cart-items');
    const isExpanded = document.getElementById('user-order-list').getAttribute('aria-expanded') === 'true';
    updateOrderSummary(orderNo, orderCost, cartItems, isExpanded);
  } else {
    console.error('[INDEX] Item not found in menuCache:', itemId);
  }
}

function handleQuantityChange(button, change) {
  const itemId = button.dataset.itemId;
  const safeId = sanitizeId(itemId);
  console.log('[INDEX] Handling quantity change for item:', itemId, 'Change:', change);
  const qtyDisplay = document.getElementById(`qty-${safeId}`);
  if (qtyDisplay) {
    let currentQty = parseInt(qtyDisplay.textContent) || 0;
    currentQty = Math.max(0, Math.min(50, currentQty + change));
    qtyDisplay.textContent = currentQty;
    console.log('[INDEX] Updated quantity for', itemId, 'to', currentQty);
    
    const item = menuCache.find((i) => i.id === itemId);
    if (item) {
      updateCartItemQuantity(itemId, currentQty);
    } else {
      console.error('[INDEX] Item not found in menuCache:', itemId);
    }

    validateQuantityInput(qtyDisplay);
    const incrementBtn = document.querySelector(`.qty-increment[data-item-id="${itemId}"]`);
    const decrementBtn = document.querySelector(`.qty-decrement[data-item-id="${itemId}"]`);
    if (incrementBtn) incrementBtn.disabled = currentQty >= 50;
    if (decrementBtn) decrementBtn.disabled = currentQty <= 0;
    
    updateTotalBill();
    const orderNo = document.getElementById('order-list-no');
    const orderCost = document.getElementById('order-list-cost');
    const cartItems = document.getElementById('cart-items');
    const isExpanded = document.getElementById('user-order-list').getAttribute('aria-expanded') === 'true';
    updateOrderSummary(orderNo, orderCost, cartItems, isExpanded);
  } else {
    console.error(`[INDEX] Quantity display not found: #qty-${safeId}`);
  }
}

async function handleCartOrder() {
  console.log("[INDEX] handleCartOrder triggered");

  const userId = localStorage.getItem("userId");
  if (!userId) {
    console.error("[INDEX] No userId found in localStorage");
    return showError("User not identified");
  }

  try {
    const res = await fetch("/orders/from-cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    });
    const result = await res.json();
    if (!res.ok) {
      console.error("[INDEX] Failed to place order:", result);
      return showError(result.error || "Could not place order");
    }
    console.log("[INDEX] Order placed successfully:", result);

    openOrderModal(result.orderId, result.total);
  } catch (err) {
    console.error("[INDEX] handleCartOrder error:", err);
    showError("Failed to place order from cart");
  }
}

function showSuccess(message) {
  console.log('[INDEX] Showing success message:', message);
  alert(message);
}

function showError(message) {
  console.error('[INDEX] Showing error message:', message);
  alert(`Error: ${message}`);
}

function formatRupiah(amount) {
  try {
    return `Rp${Number(amount).toLocaleString("id-ID")}`;
  } catch (error) {
    console.error("[INDEX] formatRupiah failed:", error);
    return "Rp0";
  }
}

function initOrderSummary() {
  const orderList = document.getElementById('user-order-list');
  const orderNo = document.getElementById('order-list-no');
  const orderCost = document.getElementById('order-list-cost');
  const orderProcess = document.getElementById('order-process');
  const doubleArrow = document.getElementById('double-arrow');
  const cartItems = document.getElementById('cart-items');

  let isExpanded = false;

  function toggleExpand() {
    isExpanded = !isExpanded;
    cartItems.style.display = isExpanded ? 'block' : 'none';
    doubleArrow.textContent = isExpanded ? '⯅' : '⯆';
    orderList.setAttribute('aria-expanded', isExpanded);
    updateOrderSummary(orderNo, orderCost, cartItems, isExpanded);
  }

  const orderProcessButton = orderProcess?.querySelector('button');
  if (orderProcessButton) {
    orderProcessButton.addEventListener('click', handleCartOrder);
  } else {
    console.error('[INDEX] Order process button not found inside #order-process');
  }

  orderList.addEventListener('click', toggleExpand);
  doubleArrow.addEventListener('click', toggleExpand);

  updateOrderSummary(orderNo, orderCost, cartItems, isExpanded);
}

export { showSuccess, showError, menuCache, formatRupiah };