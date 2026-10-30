require('dotenv').config();
const express = require('express');
const cors = require('cors');
const vitaminsRouter = require('./routes/vitamins');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());       // разрешаем запросы с фронтенда (другой домен/порт)
app.use(express.json());

app.use('/api/vitamins', vitaminsRouter);

// Проверка, что сервер жив
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
    res.json({ name: 'HealthHelper API', endpoints: ['/api/health', '/api/vitamins'] });
});

app.listen(PORT, () => {
    console.log(`HealthHelper API запущен на порту ${PORT}`);
});