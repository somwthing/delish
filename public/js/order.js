// File: public/js/order.js
// Responsible for opening the order modal and submitting client details
import { getCartItems, resetCart, calculateTotal } from "./cart.js";
import { showSuccess, showError, formatRupiah } from "./index.js";

export function openOrderModal(orderId = null, total = null) {
  let modal = document.getElementById("order-modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "order-modal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="order-modal-title">
        <div class="modal-header">
          <h2 id="order-modal-title">Complete Order</h2>
          <button class="close" aria-label="Close">&times;</button>
        </div>
        <div class="modal-body">
          <p id="order-summary-text"></p>
          <label for="client-name">Client Name</label>
          <input type="text" id="client-name" required />
          <label for="client-contact">Contact Number</label>
          <input type="tel" id="client-contact" required />
          <label for="client-email">Email</label>
          <input type="email" id="client-email" required />
          <label for="client-address">Address</label>
          <input type="text" id="client-address" required />
          <label for="client-building">House / Building / Office Name</label>
          <input type="text" id="client-building" required />
          <label for="client-floor">Floor</label>
          <input type="text" id="client-floor" required />
          <label for="payment-image">Upload Payment Proof</label>
          <input type="file" id="payment-image" accept="image/*" />
        </div>
        <div class="modal-footer">
          <button id="submitBtn" type="button">Submit Order</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector(".close").addEventListener("click", () => {
      modal.style.display = "none";
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
  }

  const submitBtn = modal.querySelector("#submitBtn");
  submitBtn.onclick = (e) => handleOrderSubmit(e, modal);

  if (orderId) modal.dataset.orderId = orderId;
  if (total != null) modal.dataset.total = total;

  const summaryText = modal.querySelector("#order-summary-text");
  if (summaryText) {
    const items = getCartItems();
    if (!items || items.length === 0) {
      const displayTotal = total != null ? total : calculateTotal();
      summaryText.innerHTML = `<strong>Order ID:</strong> ${orderId || '—'}<br><strong>Total:</strong> ${formatRupiah(displayTotal)}`;
    } else {
      const displayTotal = calculateTotal();
      summaryText.innerHTML = `<strong>Items:</strong> ${items.length} — <strong>Total:</strong> ${formatRupiah(displayTotal)}`;
    }
  }

  modal.style.display = "flex";
  setTimeout(() => modal.querySelector("#client-name")?.focus(), 50);
}

async function handleOrderSubmit(event, modal) {
  try {
    event.preventDefault();

    const orderId = modal.dataset.orderId;
    if (!orderId) {
      return showError("No order reference found. Please place order from cart first.");
    }

    const clientName = (modal.querySelector("#client-name")?.value || "").trim();
    const clientContact = (modal.querySelector("#client-contact")?.value || "").trim();
    const clientEmail = (modal.querySelector("#client-email")?.value || "").trim();
    const clientAddress = (modal.querySelector("#client-address")?.value || "").trim();
    const clientBuilding = (modal.querySelector("#client-building")?.value || "").trim();
    const clientFloor = (modal.querySelector("#client-floor")?.value || "").trim();
    const paymentImageInput = modal.querySelector("#payment-image");

    if (!clientName || !clientContact || !clientEmail || !clientAddress || !clientBuilding || !clientFloor) {
      return showError("Please fill in all required fields.");
    }

    const formData = new FormData();
    formData.append("clientName", clientName);
    formData.append("clientContact", clientContact);
    formData.append("clientEmail", clientEmail);
    formData.append("clientAddress", clientAddress);
    formData.append("clientBuilding", clientBuilding);
    formData.append("clientFloor", clientFloor);

    const userId = localStorage.getItem("userId");
    if (userId) formData.append("userId", userId);

    if (paymentImageInput && paymentImageInput.files && paymentImageInput.files[0]) {
      formData.append("paymentImage", paymentImageInput.files[0]);
    }

    const res = await fetch(`/orders/${encodeURIComponent(orderId)}/details`, {
      method: "POST",
      body: formData
    });

    const result = await res.json().catch(() => ({ message: 'Invalid JSON response', ok: res.ok }));

    if (!res.ok) {
      console.error("[ORDER] attach details failed:", result);
      return showError(result.error || result.message || "Failed to attach details to order");
    }

    showSuccess("Order details submitted successfully.");
    modal.style.display = "none";

    try {
      await resetCart();
    } catch (err) {
      console.warn("[ORDER] resetCart failed after submit:", err);
    }
  } catch (err) {
    console.error("[ORDER] handleOrderSubmit error:", err);
    showError("Could not submit order details. Try again.");
  }
}