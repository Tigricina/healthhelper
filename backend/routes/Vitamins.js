const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/vitamins — список всех витаминов
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT code, name, is_fat_soluble, daily_norm_mg FROM vitamins ORDER BY code'
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Не удалось получить список витаминов' });
    }
});

// GET /api/vitamins/:code — подробности по одному витамину
router.get('/:code', async (req, res) => {
    const { code } = req.params;
    try {
        const { rows } = await pool.query(
            'SELECT code, name, is_fat_soluble, daily_norm_mg, absorption_info FROM vitamins WHERE code = $1',
            [code.toUpperCase()]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: `Витамин с кодом "${code}" не найден` });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Не удалось получить данные витамина' });
    }
});

// GET /api/vitamins/:code/products — продукты с этим витамином + расчёт нужного количества грамм
router.get('/:code/products', async (req, res) => {
    const { code } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // максимум 100 за раз

    try {
        const vitaminRes = await pool.query(
            'SELECT id, code, name, daily_norm_mg, absorption_info FROM vitamins WHERE code = $1',
            [code.toUpperCase()]
        );
        if (vitaminRes.rows.length === 0) {
            return res.status(404).json({ error: `Витамин с кодом "${code}" не найден` });
        }
        const vitamin = vitaminRes.rows[0];

        const productsRes = await pool.query(
            `SELECT p.name,
                pv.amount_per_100g,
                ROUND(v.daily_norm_mg / NULLIF(pv.amount_per_100g, 0) * 100, 1) AS grams_needed
        FROM product_vitamins pv
        JOIN products p ON p.id = pv.product_id
        JOIN vitamins v ON v.id = pv.vitamin_id
        WHERE v.code = $1
        ORDER BY grams_needed ASC NULLS LAST
        LIMIT $2`,
            [code.toUpperCase(), limit]
        );

        res.json({
            vitamin: {
                code: vitamin.code,
                name: vitamin.name,
                daily_norm_mg: vitamin.daily_norm_mg,
                absorption_info: vitamin.absorption_info,
            },
            products: productsRes.rows,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Не удалось получить продукты для витамина' });
    }
});

module.exports = router;