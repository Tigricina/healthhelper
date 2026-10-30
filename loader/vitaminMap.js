// Соответствие: код витамина в нашей БД -> подстрока названия нутриента в USDA FoodData Central.
// Сопоставление идёт по названию (case-insensitive includes), а не по числовому ID нутриента —
// так надёжнее: названия видны прямо в ответе API и не зависят от возможных ошибок в id.
//
// Если для одного витамина в USDA несколько вариантов записи (например, международные единицы
// и микрограммы), выбираем вариант в "стандартных" единицах (мг/мкг), а не IU.

module.exports = {
    A: { usdaName: 'Vitamin A, RAE', unit: 'mcg' },
    C: { usdaName: 'Vitamin C, total ascorbic acid', unit: 'mg' },
    D: { usdaName: 'Vitamin D (D2 + D3)', unit: 'mcg' },
    E: { usdaName: 'Vitamin E (alpha-tocopherol)', unit: 'mg' },
    K: { usdaName: 'Vitamin K (phylloquinone)', unit: 'mcg' },
    B1: { usdaName: 'Thiamin', unit: 'mg' },
    B2: { usdaName: 'Riboflavin', unit: 'mg' },
    B3: { usdaName: 'Niacin', unit: 'mg' },
    B6: { usdaName: 'Vitamin B-6', unit: 'mg' },
    B9: { usdaName: 'Folate, total', unit: 'mcg' },
    B12: { usdaName: 'Vitamin B-12', unit: 'mcg' },
};
