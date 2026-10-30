// Адрес вашего backend API. При деплое backend на хостинг — замените на реальный URL.
const API_BASE = 'http://localhost:3000/api';

const vitaminSelect = document.getElementById('vitamin-select');
const form = document.getElementById('vitamin-form');
const statusEl = document.getElementById('status');
const vitaminInfoEl = document.getElementById('vitamin-info');
const vitaminNameEl = document.getElementById('vitamin-name');
const vitaminNormEl = document.getElementById('vitamin-norm');
const vitaminAbsorptionEl = document.getElementById('vitamin-absorption');
const productsListEl = document.getElementById('products-list');

// Показать/скрыть статусное сообщение
function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.hidden = false;
}

function hideStatus() {
    statusEl.hidden = true;
}

// Загрузить список витаминов при открытии страницы
async function loadVitamins() {
    try {
        const res = await fetch(`${API_BASE}/vitamins`);
        if (!res.ok) throw new Error('Сервер вернул ошибку');
        const vitamins = await res.json();

        vitaminSelect.innerHTML = '';
        vitamins.forEach((v) => {
            const option = document.createElement('option');
            option.value = v.code;
            option.textContent = `${v.name} (${v.code})`;
            vitaminSelect.appendChild(option);
        });
    } catch (err) {
        console.error(err);
        showStatus('Не удалось загрузить список витаминов. Проверьте, запущен ли backend-сервер.', 'error');
    }
}

// Отрисовать карточку продукта
function renderProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const gramsText = product.grams_needed === null
        ? 'нет данных'
        : `${product.grams_needed} г`;

    card.innerHTML = `
    <h3>${product.name}</h3>
    <div class="grams-needed">${gramsText}</div>
    <div class="grams-label">нужно съесть для суточной нормы</div>
  `;
    return card;
}

// Обработка отправки формы
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = vitaminSelect.value;
    if (!code) return;

    productsListEl.innerHTML = '';
    vitaminInfoEl.hidden = true;
    showStatus('Загрузка...', 'loading');

    try {
        const res = await fetch(`${API_BASE}/vitamins/${code}/products`);
        if (!res.ok) throw new Error('Сервер вернул ошибку');
        const data = await res.json();

        hideStatus();

        // Информация о витамине
        vitaminNameEl.textContent = data.vitamin.name;
        vitaminNormEl.textContent = `Суточная норма для взрослого: ${data.vitamin.daily_norm_mg} мг`;
        vitaminAbsorptionEl.textContent = data.vitamin.absorption_info || '';
        vitaminInfoEl.hidden = false;

        // Список продуктов
        if (data.products.length === 0) {
            showStatus('Для этого витамина продуктов в базе пока нет.', 'error');
        } else {
            data.products.forEach((product) => {
                productsListEl.appendChild(renderProductCard(product));
            });
        }
    } catch (err) {
        console.error(err);
        showStatus('Не удалось получить продукты. Проверьте, запущен ли backend-сервер.', 'error');
    }
});

loadVitamins();