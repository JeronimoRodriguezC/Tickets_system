const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { auth, requireRole } = require('../middleware/auth');

const ROLES = ['admin', 'requester', 'support'];

// Personas de soporte especializadas en una categoría (para el dropdown del formulario)
router.get('/support-users', auth, async (req, res) => {
  const categoryId = Number(req.query.category_id);
  if (!categoryId) return res.status(400).json({ error: 'category_id es obligatorio' });
  const [rows] = await pool.query(
    `SELECT u.id, u.name
       FROM users u JOIN support_categories sc ON sc.user_id = u.id
      WHERE u.role='support' AND u.active=1 AND sc.category_id=?
      ORDER BY u.name`,
    [categoryId]
  );
  res.json(rows);
});

router.get('/users', auth, requireRole('admin'), async (req, res) => {
  const [users] = await pool.query('SELECT id,name,email,role,department,active FROM users ORDER BY name');
  const [links] = await pool.query('SELECT user_id, category_id FROM support_categories');
  res.json(users.map((u) => ({
    ...u,
    categories: links.filter((l) => l.user_id === u.id).map((l) => l.category_id),
  })));
});

async function setCategories(userId, ids) {
  await pool.query('DELETE FROM support_categories WHERE user_id=?', [userId]);
  for (const cid of ids) {
    await pool.query('INSERT INTO support_categories (user_id, category_id) VALUES (?,?)', [userId, Number(cid)]);
  }
}

router.post('/users', auth, requireRole('admin'), async (req, res) => {
  const { name, email, password, role, department, categories = [] } = req.body || {};
  if (!name || !email || !password || !ROLES.includes(role)) {
    return res.status(400).json({ error: 'Datos incompletos o rol inválido' });
  }
  if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

  const [dup] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (dup.length) return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });

  const [r] = await pool.query(
    'INSERT INTO users (name,email,password_hash,role,department) VALUES (?,?,?,?,?)',
    [name, email, await bcrypt.hash(password, 10), role, department || null]
  );
  if (role === 'support') await setCategories(r.insertId, categories);
  res.status(201).json({ id: r.insertId });
});

router.patch('/users/:id', auth, requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.query('SELECT * FROM users WHERE id=?', [id]);
  const cur = rows[0];
  if (!cur) return res.status(404).json({ error: 'Usuario no encontrado' });

  const b = req.body || {};
  const name = b.name ?? cur.name;
  const department = b.department ?? cur.department;
  const role = b.role ?? cur.role;
  const active = b.active ?? cur.active;

  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Rol inválido' });
  if (id === req.user.id && (role !== 'admin' || !active)) {
    return res.status(400).json({ error: 'No puedes quitarte el rol de admin ni desactivarte' });
  }

  let hash = cur.password_hash;
  if (b.password) {
    if (b.password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    hash = await bcrypt.hash(b.password, 10);
  }

  await pool.query(
    'UPDATE users SET name=?, department=?, role=?, active=?, password_hash=? WHERE id=?',
    [name, department, role, active ? 1 : 0, hash, id]
  );
  if (role === 'support' && Array.isArray(b.categories)) await setCategories(id, b.categories);
  if (role !== 'support') await pool.query('DELETE FROM support_categories WHERE user_id=?', [id]);
  res.json({ ok: true });
});

module.exports = router;
