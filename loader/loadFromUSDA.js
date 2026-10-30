require('dotenv').config();
const fetch = require('node-fetch');
const { Pool } = require('pg');
const vitaminMap = require('./vitaminMap');

const API_KEY = process.env.USDA_API_KEY;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Список поисковых запросов — можно расширять своими продуктами.
// Чем шире список, тем больше данных попадёт в вашу БД.
const SEARCH_QUERIES = [
    'orange', 'lemon', 'kiwi', 'broccoli', 'spinach', 'carrot',
    'salmon', 'egg', 'liver', 'milk', 'cheese', 'almonds',
    'sunflower seeds', 'avocado', 'sweet potato', 'tuna', 'beef',
];

const RESULTS_PER_QUERY = 5; // сколько продуктов брать по каждому запросу

// Ищем продукты по ключевому слову
async function searchFoods(query) {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${API_KEY}` +
        `&query=${encodeURIComponent(query)}&pageSize=${RESULTS_PER_QUERY}` +
        `&dataType=Foundation,SR%20Legacy`; // берём проверенные типы данных, без брендовых товаров

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Search failed for "${query}": ${res.status}`);
    const data = await res.json();
    return data.foods || [];
}

// Получаем полную карточку продукта со всеми нутриентами
async function getFoodDetails(fdcId) {
    const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Details failed for fdcId ${fdcId}: ${res.status}`);
    return res.json();
}

// Переводим значение в миллиграммы (в БД все количества хранятся в мг)
function toMg(amount, unitName) {
    if (typeof amount !== 'number') return null;
    const unit = (unitName || '').toLowerCase();
    if (unit === 'mg') return amount;
    if (unit === 'ug' || unit === '\u00b5g' || unit === '\u03bcg') return amount / 1000; // мкг
    if (unit === 'g') return amount * 1000;
    return null; // IU и прочие единицы без пересчёта не используем
}

function extractVitamins(foodNutrients) {
    const found = {}; // { code: количество в мг на 100 г }

    for (const [code, { usdaName }] of Object.entries(vitaminMap)) {
        const target = usdaName.toLowerCase();

        const candidates = foodNutrients
            .map((n) => ({
                name: (n.nutrient?.name || '').toLowerCase(),
                mg: toMg(n.amount, n.nutrient?.unitName),
            }))
            .filter((c) => c.mg !== null && c.name.includes(target));

        // Точное совпадение названия важнее частичного
        const best = candidates.find((c) => c.name === target) || candidates[0];
        if (best) found[code] = best.mg;
    }
    return found;
}

async function getVitaminIdMap(client) {
    const { rows } = await client.query('SELECT id, code FROM vitamins');
    const map = {};
    rows.forEach(r => { map[r.code] = r.id; });
    return map;
}

async function insertProduct(client, name) {
    const existing = await client.query('SELECT id FROM products WHERE name = $1', [name]);
    if (existing.rows.length) return existing.rows[0].id;

    const { rows } = await client.query(
        'INSERT INTO products (name, source) VALUES ($1, $2) RETURNING id',
        [name, 'usda']
    );
    return rows[0].id;
}

async function insertProductVitamin(client, productId, vitaminId, amount) {
    await client.query(
        `INSERT INTO product_vitamins (product_id, vitamin_id, amount_per_100g)
     VALUES ($1, $2, $3)
     ON CONFLICT (product_id, vitamin_id) DO UPDATE SET amount_per_100g = EXCLUDED.amount_per_100g`,
        [productId, vitaminId, amount]
    );
}

async function main() {
    const client = await pool.connect();
    try {
        const vitaminIdByCode = await getVitaminIdMap(client);
        if (Object.keys(vitaminIdByCode).length === 0) {
            throw new Error('Таблица vitamins пуста — сначала внесите витамины (код, норма, справка).');
        }

        let totalProducts = 0;
        let totalLinks = 0;

        for (const query of SEARCH_QUERIES) {
            console.log(`Ищу: ${query}`);
            const foods = await searchFoods(query);

            for (const food of foods) {
                const details = await getFoodDetails(food.fdcId);
                const vitaminsFound = extractVitamins(details.foodNutrients || []);

                if (Object.keys(vitaminsFound).length === 0) continue; // пропускаем, если нет ни одного нужного витамина

                const productId = await insertProduct(client, details.description);
                totalProducts++;

                for (const [code, amount] of Object.entries(vitaminsFound)) {
                    const vitaminId = vitaminIdByCode[code];
                    if (!vitaminId) continue; // такого кода нет в таблице vitamins — пропускаем
                    if (!(amount > 0)) continue; // нулевое или некорректное значение — пропускаем
                    await insertProductVitamin(client, productId, vitaminId, amount);
                    totalLinks++;
                }

                console.log(`  + ${details.description}: найдено витаминов — ${Object.keys(vitaminsFound).join(', ')}`);
                await new Promise(r => setTimeout(r, 150)); // небольшая пауза, чтобы не упереться в лимит запросов
            }
        }

        console.log(`\nГотово. Загружено продуктов: ${totalProducts}, записей product_vitamins: ${totalLinks}`);
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(err => {
    console.error('Ошибка загрузки:', err);
    process.exit(1);
});


