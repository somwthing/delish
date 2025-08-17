import { formatRupiah } from "./index.js";

function logError(scope, error) {
  console.error(`[${scope}]`, error?.message || error);
}

function sanitizeId(id) {
  return id.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
}

export async function fetchMenuData() {
  try {
    console.log('[MENU] Fetching menu data from /api/menu...');
    const response = await fetch("/api/menu");
    if (!response.ok) throw new Error(`Failed to fetch menu: ${response.status}`);
    const data = await response.json();
    console.log('[MENU] Menu data received:', JSON.stringify(data, null, 2));
    // Flatten the data into a single array with category information
    const menuData = Object.entries(data).reduce((acc, [category, items]) => {
      return acc.concat(items.map(item => ({ ...item, category })));
    }, []);
    return menuData;
  } catch (error) {
    logError("MENU_FETCH", error);
    return [];
  }
}

export function renderMenu(menuData, onItemClick) {
  console.log('[MENU] Rendering menu with data:', JSON.stringify(menuData, null, 2));
  const menuContainer = document.querySelector(".menu-container");
  if (!menuContainer) {
    logError("MENU_RENDER", ".menu-container not found");
    return;
  }

  menuContainer.innerHTML = "";

  menuData.forEach((item, index) => {
    if (!item.id) {
      console.warn(`[MENU] Skipping item at index ${index}: Missing id`);
      return;
    }
    const safeId = sanitizeId(item.id);
    console.log(`[MENU] Creating card for item - ID: ${item.id}, Name: ${item.name}, Category: ${item.category}`);

    const card = document.createElement("div");
    card.className = "menu-card";
    card.id = `menu-item-${safeId}`;
    card.dataset.id = item.id;
    card.dataset.category = item.category;

    card.innerHTML = `
      <div class="card-content">
        <div class="card-header">
          <div class="image-container">
            <img src="${item.image}" alt="${item.name}" onerror="this.src='/images/default.jpg'" />
          </div>
        </div>
        <div class="card-footer">
          <div class="title-price-container">
            <div class="title-price-row">
              <h3 class="card-title">${item.name}</h3>
              <div class="price-tag">${formatRupiah(item.price)}</div>
            </div>
            <p class="card-description">${item.description}</p>
          </div>
          <div class="quantity-control">
            <div class="quantity-group">
              <label for="qty-${safeId}" class="${item.category === 'home' ? 'qty-home-label' : ''}">Qty:</label>
              <div class="quantity-buttons">
                <button class="qty-btn qty-decrement" data-item-id="${item.id}">–</button>
                <span id="qty-${safeId}" class="qty-display" data-item-id="${item.id}">0</span>
                <button class="qty-btn qty-increment" data-item-id="${item.id}">+</button>
              </div>
            </div>
            <div class="card-actions">
              <button class="add-to-cart-btn" data-item-id="${item.id}">Add to Cart</button>
            </div>
          </div>
        </div>
      </div>
    `;
    menuContainer.appendChild(card);
  });

  console.log(`[MENU] Rendered ${menuData.length} menu items`);
}

export function initSquares() {
  console.log('[SQUARES] Initializing squares...');
  const squares = document.querySelectorAll('.square');
  const wrapperContainer = document.querySelector('.menu-item-wrapper');

  squares.forEach(square => {
    square.addEventListener('click', () => {
      squares.forEach(s => s.classList.remove('selected'));
      square.classList.add('selected');
      const section = square.dataset.section;
      wrapperContainer.classList.toggle('hidden', section !== 'wrapper');
      filterMenuBySection(section, section === 'wrapper' ? 'yummy' : null);
    });
  });

  const homeSquare = document.querySelector('.home-square');
  if (homeSquare) {
    homeSquare.classList.add('selected');
    wrapperContainer.classList.add('hidden');
    filterMenuBySection('home');
  }

  initTabs();
}

function initTabs() {
  console.log('[TABS] Initializing tabs...');
  const tabs = document.querySelectorAll('.tab');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabValue = tab.dataset.tab;
      filterMenuBySection('wrapper', tabValue);
    });
  });

  const yummyTab = document.querySelector('.tab[data-tab="yummy"]');
  if (yummyTab) {
    yummyTab.classList.add('active');
  }
}

function filterMenuBySection(section, tab = null) {
  console.log('[SQUARES] Filtering menu for section:', section, 'tab:', tab);
  const menuCards = document.querySelectorAll('.menu-card');

  const sectionToCategoryMap = {
    home: 'home',
    promo: 'promo',
    wrapper: {
      'value-pack': 'value-pack',
      yummy: 'yummy',
      special: 'special'
    }
  };

  let targetCategory;
  if (section === 'wrapper') {
    targetCategory = sectionToCategoryMap.wrapper[tab || 'yummy'];
  } else {
    targetCategory = sectionToCategoryMap[section];
  }

  let shownCards = 0;
  menuCards.forEach(card => {
    const cardCategory = card.dataset.category;
    if (cardCategory === targetCategory) {
      console.log(`[SQUARES] Showing card ID: ${card.id}, Category: ${cardCategory}`);
      card.style.display = 'block';
      shownCards++;
    } else {
      console.log(`[SQUARES] Hiding card ID: ${card.id}, Category: ${cardCategory}`);
      card.style.display = 'none';
    }
  });

  if (shownCards === 0) {
    console.warn(`[SQUARES] No menu cards shown for category ${targetCategory}. Check if data-category attributes match.`);
  } else {
    console.log(`[SQUARES] Total cards shown: ${shownCards}`);
  }
}