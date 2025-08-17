// File: public/js/cart.js
// Frontend cart manager: always includes userId (from localStorage) when calling cart APIs.
// Provides: fetchCartData, getCartItems, addToCart, updateCartItemQuantity, calculateTotal,
//           validateQuantityInput, updateTotalBill, resetCart, syncCartWithUI

console.log("[CART] cart.js loaded");

import { showError } from "./index.js";

let inMemoryCart = [];

/**
 * Get userId used by the frontend (stored in localStorage).
 * Returns null if not set.
 */
function getClientUserId() {
  try {
    return localStorage.getItem("userId");
  } catch (err) {
    console.error("[CART] getClientUserId error:", err);
    return null;
  }
}

/**
 * GET /api/cart?userId=...
 * Loads the cart for the current user and stores it in inMemoryCart.
 */
async function fetchCartData() {
  try {
    console.log("[CART] Fetching cart data...");
    const userId = getClientUserId();
    const url = userId ? `/api/cart?userId=${encodeURIComponent(userId)}` : `/api/cart`;
    const res = await fetch(url, { method: "GET", headers: { "Accept": "application/json" } });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`HTTP error! status: ${res.status} ${errText}`);
    }
    const data = await res.json();
    // ensure consistent structure: server returns an array (user's cart)
    inMemoryCart = Array.isArray(data) ? data : [];
    console.log("[CART] Cart fetched:", inMemoryCart);
    syncCartWithUI();
    return inMemoryCart;
  } catch (err) {
    console.error("[CART] Failed to fetch cart data:", err);
    showError(`Failed to fetch cart: ${err.message}`);
    inMemoryCart = [];
    return [];
  }
}

function getCartItems() {
  return inMemoryCart;
}

/**
 * POST /api/cart  with { itemId, quantity, userId }
 * Adds item to cart on server, updates inMemoryCart on success.
 */
async function addToCart(item) {
  try {
    console.log(`[CART] Adding item to cart: ${item.id} (${item.name})`);
    const userId = getClientUserId();
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, quantity: 1, userId })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: res.status }));
      throw new Error(`[CART] addToCart failed: ${errorData.message || res.status}`);
    }
    inMemoryCart = await res.json();
    console.log("[CART] Item added successfully. Updated cart:", inMemoryCart);
    syncCartWithUI();
  } catch (err) {
    console.error("[CART] addToCart error:", err);
    showError(`Failed to add item to cart: ${err.message}`);
  }
}

/**
 * PUT /api/cart/:itemId with body { quantity, userId }
 * Updates quantity, or deletes if quantity <= 0.
 */
async function updateCartItemQuantity(itemId, quantity) {
  try {
    console.log(`[CART] Updating quantity: ${itemId} -> ${quantity}`);
    const userId = getClientUserId();
    const res = await fetch(`/api/cart/${encodeURIComponent(itemId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity, userId })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: res.status }));
      throw new Error(`[CART] updateCartItem failed: ${errorData.message || res.status}`);
    }
    inMemoryCart = await res.json();
    console.log("[CART] Quantity update successful. Updated cart:", inMemoryCart);
    syncCartWithUI();
  } catch (err) {
    console.error("[CART] updateCartItemQuantity error:", err);
    showError(`Failed to update cart: ${err.message}`);
  }
}

/**
 * DELETE /api/cart/:itemId with body { userId } (some fetch clients don't allow body for DELETE;
 * we will send userId as query param to be safe)
 */
async function removeCartItem(itemId) {
  try {
    console.log(`[CART] Removing item from cart: ${itemId}`);
    const userId = getClientUserId();
    const url = userId ? `/api/cart/${encodeURIComponent(itemId)}?userId=${encodeURIComponent(userId)}` : `/api/cart/${encodeURIComponent(itemId)}`;
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: res.status }));
      throw new Error(`[CART] removeCartItem failed: ${errorData.message || res.status}`);
    }
    inMemoryCart = await res.json();
    console.log("[CART] Item removed. Updated cart:", inMemoryCart);
    syncCartWithUI();
  } catch (err) {
    console.error("[CART] removeCartItem error:", err);
    showError(`Failed to remove cart item: ${err.message}`);
  }
}

function calculateTotal() {
  return inMemoryCart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function validateQuantityInput(qtyElement) {
  let qty = parseInt(qtyElement.textContent) || 0;
  if (qty < 0) qty = 0;
  if (qty > 50) qty = 50;
  qtyElement.textContent = qty;
}

function updateTotalBill() {
  const totalElement = document.getElementById("total-bill");
  if (totalElement) {
    totalElement.textContent = `Rp${calculateTotal().toLocaleString("id-ID")}`;
  }
}

/**
 * Reset cart on server (delete each item) then clear inMemoryCart and UI.
 * Used after a successful order.
 */
async function resetCart() {
  try {
    console.log("[CART] Resetting cart...");
    const userId = getClientUserId();
    // Clear server-side cart by writing empty array via a dedicated endpoint or deleting items.
    // We'll call DELETE /api/cart/clear?userId=...
    const clearUrl = userId ? `/api/cart/clear?userId=${encodeURIComponent(userId)}` : `/api/cart/clear`;
    const res = await fetch(clearUrl, { method: "POST" }); // POST for clearing is safer than DELETE with body
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: res.status }));
      throw new Error(`[CART] resetCart failed: ${errorData.message || res.status}`);
    }
    inMemoryCart = [];
    console.log("[CART] Cart reset successful (frontend).");
    syncCartWithUI();
  } catch (err) {
    console.error("[CART] resetCart error:", err);
    showError(`Failed to reset cart: ${err.message}`);
  }
}

/**
 * Keep the UI in sync with inMemoryCart. Updates quantity displays and disables buttons as needed.
 */
function syncCartWithUI() {
  const cartItems = getCartItems();
  cartItems.forEach(item => {
    const safeId = item.itemId.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
    const qtyDisplay = document.getElementById(`qty-${safeId}`);
    if (qtyDisplay) {
      qtyDisplay.textContent = item.quantity;
      validateQuantityInput(qtyDisplay);
      const incrementBtn = document.querySelector(`.qty-increment[data-item-id="${item.itemId}"]`);
      const decrementBtn = document.querySelector(`.qty-decrement[data-item-id="${item.itemId}"]`);
      if (incrementBtn) incrementBtn.disabled = item.quantity >= 50;
      if (decrementBtn) decrementBtn.disabled = item.quantity <= 0;
    }
  });
  updateTotalBill();
}

export {
  fetchCartData,
  getCartItems,
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
  calculateTotal,
  validateQuantityInput,
  updateTotalBill,
  resetCart,
  syncCartWithUI
};
