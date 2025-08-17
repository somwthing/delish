// File: /public/js/modal.js

export function setupImageModal() {
  const popup = document.getElementById("image-popup");
  const popupImg = document.getElementById("popup-image");

  document.body.addEventListener("click", (e) => {
    if (e.target.matches(".image-container img")) {
      popupImg.src = e.target.src;
      popup.style.display = "flex";
    }
    if (e.target.matches(".image-popup") || e.target.matches(".close-popup")) {
      popup.style.display = "none";
      popupImg.src = "";
    }
  });
}