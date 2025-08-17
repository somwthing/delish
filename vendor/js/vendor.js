// File: vendor/js/vendor.js
let allCategories = [];
let currentItems = [];

async function fetchCategories() {
  try {
    const loader = document.querySelector('.loading-spinner');
    if (loader) loader.style.display = 'flex';
    
    const res = await fetch('/vendor/categories', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`);
    allCategories = await res.json();
    populateCategorySelect();
    await fetchItemsForAllCategories();
  } catch (err) {
    console.error('Error fetching categories:', err);
    showToast('Failed to load categories', 'error');
  } finally {
    const loader = document.querySelector('.loading-spinner');
    if (loader) loader.style.display = 'none';
  }
}

async function fetchItemsForAllCategories() {
  currentItems = [];
  for (const category of allCategories) {
    try {
      const res = await fetch(`/vendor/menu/${category}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to fetch items for ${category}: ${res.status}`);
      const items = await res.json();
      currentItems.push({ category, items });
    } catch (err) {
      console.error(`Error fetching items for ${category}:`, err);
    }
  }
  renderMenuItems(currentItems);
}

function populateCategorySelect() {
  const select = document.getElementById('item-select');
  if (!select) return;

  select.innerHTML = '<option value="">Add new category</option>';
  allCategories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });
}

function renderMenuItems(categories) {
  const container = document.getElementById('menu-container');
  if (!container) return;

  container.innerHTML = '';
  if (categories.length === 0) {
    container.innerHTML = `<div class="empty-state">No categories found</div>`;
    return;
  }

  categories.forEach(category => {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.innerHTML = `
      <div class="order-header" onclick="this.parentElement.classList.toggle('expanded')">
        <div class="order-id">${category.category}</div>
        <div class="order-price">${category.items.length} item${category.items.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="order-content">
        <div class="order-details">
          ${category.items.map((item, index) => `
            <div class="order-detail">
              <strong>Name:</strong> ${item.name}<br>
              <strong>Price:</strong> Rp ${Number(item.price || 0).toLocaleString()}<br>
              <strong>Description:</strong> ${item.description || 'N/A'}<br>
              <strong>Image:</strong> <img src="${item.image}" alt="${item.name}" style="max-width: 100px;">
            </div>
            <div class="action-buttons">
              <button class="btn btn-primary" onclick="editMenuItem('${category.category}', ${index})">Edit</button>
              <button class="btn btn-danger" onclick="deleteMenuItem('${category.category}', ${index})">Delete</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

async function saveMenuItem(event) {
  event.preventDefault();
  const form = document.getElementById('menu-form');
  const formData = new FormData(form);
  const selectedCategory = formData.get('item-select');
  const newCategory = formData.get('new-id');
  const itemIndex = formData.get('item-index');
  const category = selectedCategory || newCategory;
  const url = itemIndex ? `/vendor/menu/${selectedCategory}/${itemIndex}` : `/vendor/menu/${category}`;
  const method = itemIndex ? 'PUT' : 'POST';

  if (!category) {
    showToast('Please select or enter a category', 'error');
    return;
  }
  formData.set('id', category);

  try {
    const loader = document.querySelector('.loading-spinner');
    if (loader) loader.style.display = 'flex';

    const res = await fetch(url, {
      method,
      body: formData
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to save menu item: ${res.status}`);
    }

    const data = await res.json();
    showToast(data.message, 'success');
    form.reset();
    document.getElementById('item-id').value = '';
    document.getElementById('item-index').value = '';
    document.getElementById('item-select').value = '';
    document.getElementById('new-id').value = '';
    document.getElementById('new-id-group').style.display = 'none';
    document.getElementById('cancel-edit').style.display = 'none';
    await fetchCategories();
  } catch (err) {
    console.error('Error saving menu item:', err);
    showToast(err.message || 'Failed to save menu item', 'error');
  } finally {
    const loader = document.querySelector('.loading-spinner');
    if (loader) loader.style.display = 'none';
  }
}

function editMenuItem(category, index) {
  const categoryData = currentItems.find(cat => cat.category === category);
  if (!categoryData || !categoryData.items[index]) return;

  const item = categoryData.items[index];
  document.getElementById('item-id').value = category;
  document.getElementById('item-index').value = index;
  document.getElementById('item-select').value = category;
  document.getElementById('new-id-group').style.display = 'none';
  document.getElementById('name').value = item.name;
  document.getElementById('price').value = item.price;
  document.getElementById('description').value = item.description;
  document.getElementById('cancel-edit').style.display = 'inline-block';
}

async function deleteMenuItem(category, index) {
  if (!confirm(`Are you sure you want to delete item ${index + 1} from category ${category}?`)) return;

  try {
    const loader = document.querySelector('.loading-spinner');
    if (loader) loader.style.display = 'flex';

    const res = await fetch(`/vendor/menu/${category}/${index}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to delete menu item: ${res.status}`);
    }

    const data = await res.json();
    showToast(data.message, 'success');
    await fetchCategories();
  } catch (err) {
    console.error('Error deleting menu item:', err);
    showToast(err.message || 'Failed to delete menu item', 'error');
  } finally {
    const loader = document.querySelector('.loading-spinner');
    if (loader) loader.style.display = 'none';
  }
}

function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

document.getElementById('item-select')?.addEventListener('change', (e) => {
  const newIdGroup = document.getElementById('new-id-group');
  newIdGroup.style.display = e.target.value === '' ? 'block' : 'none';
});

document.getElementById('menu-form')?.addEventListener('submit', saveMenuItem);
document.getElementById('cancel-edit')?.addEventListener('click', () => {
  document.getElementById('menu-form').reset();
  document.getElementById('item-id').value = '';
  document.getElementById('item-index').value = '';
  document.getElementById('item-select').value = '';
  document.getElementById('new-id').value = '';
  document.getElementById('new-id-group').style.display = 'block';
  document.getElementById('cancel-edit').style.display = 'none';
});
document.getElementById('refresh-btn')?.addEventListener('click', () => {
  const loader = document.querySelector('.loading-spinner');
  if (loader) loader.style.display = 'flex';
  fetchCategories();
});

document.addEventListener('DOMContentLoaded', fetchCategories);