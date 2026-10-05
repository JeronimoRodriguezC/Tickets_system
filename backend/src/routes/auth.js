const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { auth } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña requeridos' });

  const [rows] = await pool.query('SELECT * FROM users WHERE email=? AND active=1', [email]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(password, u.password_hash))) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = jwt.sign({ id: u.id, role: u.role, name: u.name }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
  res.json({ token, user: { id: u.id, name: u.name, email: u.email, role: u.role, department: u.department } });
});

router.get('/me', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT id,name,email,role,department FROM users WHERE id=? AND active=1', [req.user.id]);
  if (!rows[0]) return res.status(401).json({ error: 'Usuario inactivo o inexistente' });
  res.json(rows[0]);
});

router.post('/change-password', auth, async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password || new_password.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }
  const [rows] = await pool.query('SELECT password_hash FROM users WHERE id=?', [req.user.id]);
  if (!rows[0] || !(await bcrypt.compare(current_password, rows[0].password_hash))) {
    return res.status(401).json({ error: 'Contraseña actual incorrecta' });
  }
  await pool.query('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash(new_password, 10), req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
