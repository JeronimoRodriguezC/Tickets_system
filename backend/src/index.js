require('express-async-errors');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api', require('./routes/users')); // /users y /support-users

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Archivo demasiado grande (máx. 10 MB)' });
  if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: 'Máximo 5 archivos por ticket' });
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(3000, () => console.log('API lista en el puerto 3000'));
