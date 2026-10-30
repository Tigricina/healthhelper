# HealthHelper — пет-проект по нутрициологии

https://healthhelper-tau.vercel.app - Веб-сайт.
https://t.me/hh_vitamins_bot -  Telegram-бот.

**Первый запрос может идти до 50 секунд из-за бесплатного тарифа, сайт и Telegram-бот работают.**

## О проекте

**HealthHelper** — учебный/демонстрационный проект, показывающий навыки:
- проектирования баз данных и работы с SQL;
- разработки backend и REST API;
- интеграции с внешними API;
- разработки адаптивного веб-интерфейса.

**Функциональность:**
- Веб-сайт: пользователь выбирает витамин(ы) и получает список продуктов, в которых он содержится, суточную норму для взрослого, сколько граммов продукта нужно съесть для получения нормы, и краткую справку об усваиваемости.
- Telegram-бот с той же логикой, использующий тот же backend и ту же базу данных, что и сайт (без дублирования кода/данных).

**Технологический стек:** JavaScript/Node.js (основной backend), PostgreSQL, REST API, адаптивная вёрстка (mobile-first).

---

## 1. Архитектура

```
                    ┌──────────────────┐
                    │   PostgreSQL БД   │
                    │ (Neon / Supabase) │
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │   Backend API     │
                    │ Node.js (Express) │
                    │  или PHP (Slim/   │
                    │     Laravel)      │
                    └────────┬─────────┘
                 ┌───────────┴───────────┐
                 │                       │
        ┌────────┴────────┐     ┌────────┴────────┐
        │  Веб-фронтенд    │     │  Telegram-бот    │
        │ (адаптивный сайт)│     │   (Telegraf)     │
        └──────────────────┘     └─────────────────┘
```

Ключевая идея: **один backend и одна БД** обслуживают оба клиента — это показывает архитектурное мышление и умение избегать дублирования логики.


### Схема таблиц (PostgreSQL)

```sql
CREATE TABLE vitamins (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,        -- 'A', 'B12', 'C', 'D'
    name VARCHAR(100) NOT NULL,
    is_fat_soluble BOOLEAN NOT NULL,
    daily_norm_mg NUMERIC(10,4) NOT NULL,    -- суточная норма для взрослого
    absorption_info TEXT                      -- краткая справка об усваиваемости
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    source VARCHAR(50)                        -- 'usda', 'manual'
);

CREATE TABLE product_vitamins (
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    vitamin_id INT REFERENCES vitamins(id) ON DELETE CASCADE,
    amount_per_100g NUMERIC(10,4) NOT NULL,   -- содержание витамина на 100г продукта
    PRIMARY KEY (product_id, vitamin_id)
);
```

### Пример SQL-запроса

Расчёт, сколько граммов продукта нужно съесть для получения суточной нормы витамина C, отсортированный по возрастанию нужного количества:

```sql
SELECT p.name,
       ROUND(v.daily_norm_mg / pv.amount_per_100g * 100, 1) AS grams_needed
FROM product_vitamins pv
JOIN products p ON p.id = pv.product_id
JOIN vitamins v ON v.id = pv.vitamin_id
WHERE v.code = 'C'
ORDER BY grams_needed ASC
LIMIT 10;
```

Пример запроса с агрегацией (сколько продуктов в БД содержат конкретный витамин):

```sql
SELECT v.name, COUNT(pv.product_id) AS products_count
FROM vitamins v
LEFT JOIN product_vitamins pv ON pv.vitamin_id = v.id
GROUP BY v.name
ORDER BY products_count DESC;
```
---

## 2. Источники данных по витаминам

| Источник | Что даёт | Как использовать |
|---|---|---|
| **USDA FoodData Central API** | Данные о составе 300 000+ продуктов (макро- и микронутриенты), бесплатен | Ключ регистрируется бесплатно на api.data.gov — даёт 1000 запросов в час вместо ограниченного демо-ключа. Использовать для скрипта-загрузчика, который наполняет таблицы `products` и `product_vitamins` |
| **NIH Office of Dietary Supplements (DRI/RDA)** | Официальные нормы потребления витаминов для взрослых, а также fact sheets по усваиваемости каждого витамина | Вносится вручную (один раз) в таблицу `vitamins`: поля `daily_norm_mg` и `absorption_info` (переписать своими словами) |
| **Роспотребнадзор, МР 2.3.1.0253-21** | Альтернативный источник норм потребления, если ориентироваться на русскоязычную аудиторию | Вносится вручную аналогично |

---

## Полезные ссылки

- USDA FoodData Central: https://fdc.nal.usda.gov/
- Регистрация ключа API: https://api.data.gov/signup
- NIH Office of Dietary Supplements: https://ods.od.nih.gov/
- dbdiagram.io: https://dbdiagram.io/
- Neon: https://neon.tech/
- Supabase: https://supabase.com/
- Render: https://render.com/
- Vercel: https://vercel.com/
- InfinityFree: https://infinityfree.com/
- Serv00: https://www.serv00.com/

## Примечание
Репозиторий не содержит файлы с информацией о подключении к БД и Telegram API. Поэтому перед сборкой проекта нужно добавить эти файлы самостоятельно. А проверить работоспособность проекта можно по https://healthhelper-tau.vercel.app.