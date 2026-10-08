const bcrypt = require('bcryptjs');
const pool = require('./db');

const DEFAULT_CATEGORIES = [
  'Aplicaciones empresariales',
  'Software y licencias',
  'Hardware',
  'Red y conectividad',
  'Periféricos',
  'Accesos y permisos',
];

(async () => {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  const [admins] = await pool.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
  if (!admins.length) {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD en .env');
    await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)',
      [ADMIN_NAME || 'Administrador', ADMIN_EMAIL, await bcrypt.hash(ADMIN_PASSWORD, 10), 'admin']
    );
    console.log('Admin inicial creado:', ADMIN_EMAIL);
  }

  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM categories');
  if (n === 0) {
    for (const c of DEFAULT_CATEGORIES) await pool.query('INSERT INTO categories (name) VALUES (?)', [c]);
    console.log('Categorías iniciales creadas');
  }

  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
