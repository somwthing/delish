// //public/js/squares.js
// export function initSquares() {
//   console.log('[SQUARES] Initializing squares...');
//   const squares = document.querySelectorAll('.square');
//   console.log('[SQUARES] Found squares:', squares.length, Array.from(squares).map(s => s.dataset.section));

//   if (!squares.length) {
//     console.error('[SQUARES] No elements with class="square" found in the DOM.');
//     return;
//   }

//   squares.forEach(square => {
//     square.addEventListener('click', () => {
//       console.log('[SQUARES] Clicked square with data-section:', square.dataset.section);
//       // Remove 'selected' class from all squares
//       squares.forEach(s => s.classList.remove('selected'));
//       // Add 'selected' class to the clicked square
//       square.classList.add('selected');

//       // Filter menu by section
//       filterMenuBySection(square.dataset.section);
//     });
//   });

//   // Ensure home-square is selected by default and shows all items
//   const homeSquare = document.querySelector('.home-square');
//   if (homeSquare) {
//     console.log('[SQUARES] Setting home-square as default selected');
//     homeSquare.classList.add('selected');
//     filterMenuBySection('home');
//   } else {
//     console.warn('[SQUARES] Home square (.home-square) not found in the DOM');
//   }
// }

// function filterMenuBySection(section) {
//   console.log('[SQUARES] Filtering menu for section:', section);
//   const menuCards = document.querySelectorAll('.menu-card');
//   console.log('[SQUARES] Found menu cards:', menuCards.length);

//   if (!menuCards.length) {
//     console.error('[SQUARES] No elements with class="menu-card" found in the DOM.');
//     return;
//   }

//   let shownCards = 0;
//   menuCards.forEach(card => {
//     const cardId = card.id || 'no-id';
//     const category = card.dataset.category || 'missing';
//     console.log(`[SQUARES] Processing card - ID: ${cardId}, data-category: ${category}`);

//     // Show or hide based on section
//     if (section === 'home' || section === 'promo') {
//       console.log(`[SQUARES] Showing card ${cardId} for section ${section}`);
//       card.style.display = 'block';
//       shownCards++;
//     } else if (category === section) {
//       console.log(`[SQUARES] Showing card ${cardId} (matches category ${section})`);
//       card.style.display = 'block';
//       shownCards++;
//     } else {
//       console.log(`[SQUARES] Hiding card ${cardId} (category ${category} does not match ${section})`);
//       card.style.display = 'none';
//     }
//   });

//   if (shownCards === 0) {
//     console.warn(`[SQUARES] No menu cards shown for section ${section}. Check if data-category attributes match the section.`);
//   } else {
//     console.log(`[SQUARES] Total cards shown: ${shownCards}`);
//   }
// }