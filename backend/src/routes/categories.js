const router = require('express').Router();
const pool = require('../db');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT id, name FROM categories ORDER BY name');
  res.json(rows);
});

router.post('/', auth, requireRole('admin'), async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const [r] = await pool.query('INSERT INTO categories (name) VALUES (?)', [name]);
    res.status(201).json({ id: r.insertId, name });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Esa categoría ya existe' });
    throw e;
  }
});

router.patch('/:id', auth, requireRole('admin'), async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const [r] = await pool.query('UPDATE categories SET name=? WHERE id=?', [name, Number(req.params.id)]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Esa categoría ya existe' });
    throw e;
  }
});

module.exports = router;
