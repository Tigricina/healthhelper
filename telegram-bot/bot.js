require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fetch = require('node-fetch');

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';

const bot = new Telegraf(BOT_TOKEN);

// Кэшируем список витаминов, чтобы не запрашивать API при каждом /start
let vitaminsCache = [];

async function loadVitamins() {
    const res = await fetch(`${API_BASE}/vitamins`);
    if (!res.ok) throw new Error('Не удалось получить список витаминов с API');
    vitaminsCache = await res.json();
}

// Собираем инлайн-клавиатуру из списка витаминов (по 3 кнопки в ряд)
function buildVitaminKeyboard() {
    const buttons = vitaminsCache.map((v) =>
        Markup.button.callback(`${v.name} (${v.code})`, `vitamin:${v.code}`)
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 3) {
        rows.push(buttons.slice(i, i + 3));
    }
    return Markup.inlineKeyboard(rows);
}

// /start — приветствие и клавиатура выбора витамина
bot.start(async (ctx) => {
    try {
        if (vitaminsCache.length === 0) await loadVitamins();
        await ctx.reply(
            'Привет! Я HealthHelper — подскажу, в каких продуктах содержится витамин, ' +
            'сколько его нужно в день и сколько продукта надо съесть.\n\n' +
            'Выберите витамин:',
            buildVitaminKeyboard()
        );
    } catch (err) {
        console.error(err);
        await ctx.reply('Не получилось загрузить список витаминов. Попробуйте позже.');
    }
});

// /vitamins — то же самое, если пользователь захочет вызвать список ещё раз
bot.command('vitamins', async (ctx) => {
    try {
        if (vitaminsCache.length === 0) await loadVitamins();
        await ctx.reply('Выберите витамин:', buildVitaminKeyboard());
    } catch (err) {
        console.error(err);
        await ctx.reply('Не получилось загрузить список витаминов. Попробуйте позже.');
    }
});

// Обработка нажатия на кнопку витамина
bot.action(/^vitamin:(.+)$/, async (ctx) => {
    const code = ctx.match[1];
    await ctx.answerCbQuery(); // убираем "часики" на кнопке

    try {
        const res = await fetch(`${API_BASE}/vitamins/${code}/products?limit=10`);
        if (!res.ok) throw new Error('Ошибка API');
        const data = await res.json();

        let message = `*${data.vitamin.name}*\n`;
        message += `Суточная норма для взрослого: ${data.vitamin.daily_norm_mg} мг\n`;
        if (data.vitamin.absorption_info) {
            message += `\n_Усваиваемость:_ ${data.vitamin.absorption_info}\n`;
        }

        if (data.products.length === 0) {
            message += '\nДля этого витамина продуктов в базе пока нет.';
        } else {
            message += '\n*Продукты и сколько нужно съесть для нормы:*\n';
            data.products.forEach((p) => {
                const grams = p.grams_needed === null ? 'нет данных' : `${p.grams_needed} г`;
                message += `• ${p.name} — ${grams}\n`;
            });
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (err) {
        console.error(err);
        await ctx.reply('Не удалось получить данные. Проверьте, запущен ли backend-сервер.');
    }
});

// Обработка любого текстового сообщения — подсказка использовать /start
bot.on('text', async (ctx) => {
    await ctx.reply('Наберите /start, чтобы выбрать витамин из списка.');
});

// Запуск бота
loadVitamins()
    .then(() => {
        bot.launch();
        console.log('HealthHelper bot запущен (long polling)');
    })
    .catch((err) => {
        console.error('Не удалось запустить бота:', err);
    });

// Корректное завершение процесса
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));