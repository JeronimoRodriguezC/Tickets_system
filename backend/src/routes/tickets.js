const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const { sendMail } = require('../mailer');

const STATUSES = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const IMPACTS = ['low', 'medium', 'high'];

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf', 'text/plain'];
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) =>
    ALLOWED_TYPES.includes(file.mimetype)
      ? cb(null, true)
      : cb(Object.assign(new Error('Tipo de archivo no permitido (PNG, JPG, PDF o TXT)'), { status: 400 })),
});

// ---------- helpers ----------
const code = (id) => `IT-${id}`;
const link = (id) => `${process.env.APP_URL || ''}/tickets/${id}`;
const cleanup = (files) => (files || []).forEach((f) => fs.unlink(f.path, () => {}));

// Qué tickets puede ver cada rol
function scope(user) {
  if (user.role === 'admin') return { sql: '1=1', params: [] };
  if (user.role === 'support') return { sql: 't.assigned_to=?', params: [user.id] };
  return { sql: 't.requester_id=?', params: [user.id] };
}

async function getTicket(id) {
  const [rows] = await pool.query(
    `SELECT t.*, c.name AS category,
            r.name AS requester_name, r.email AS requester_email,
            a.name AS assigned_name,  a.email AS assigned_email
       FROM tickets t
       JOIN categories c ON c.id = t.category_id
       JOIN users r ON r.id = t.requester_id
       LEFT JOIN users a ON a.id = t.assigned_to
      WHERE t.id=?`,
    [id]
  );
  return rows[0];
}

function canAccess(user, t) {
  return (
    user.role === 'admin' ||
    (user.role === 'support' && t.assigned_to === user.id) ||
    (user.role === 'requester' && t.requester_id === user.id)
  );
}

// Carga el ticket y comprueba acceso; si no tiene acceso responde 404 (no revela que existe)
async function loadTicket(req, res, next) {
  const t = await getTicket(Number(req.params.id));
  if (!t || !canAccess(req.user, t)) return res.status(404).json({ error: 'Ticket no encontrado' });
  req.ticket = t;
  next();
}

async function log(ticketId, actorId, action, detail = null) {
  await pool.query('INSERT INTO ticket_history (ticket_id, actor_id, action, detail) VALUES (?,?,?,?)', [
    ticketId, actorId, action, detail,
  ]);
}

// ¿Esta persona es soporte activo y atiende esa categoría?
async function validSupport(userId, categoryId) {
  const [rows] = await pool.query(
    `SELECT u.id FROM users u JOIN support_categories sc ON sc.user_id = u.id
      WHERE u.id=? AND u.role='support' AND u.active=1 AND sc.category_id=?`,
    [userId, categoryId]
  );
  return rows.length > 0;
}

// ---------- listado (filtrado por rol) ----------
router.get('/', auth, async (req, res) => {
  const sc = scope(req.user);
  const where = [sc.sql];
  const params = [...sc.params];
  const { estado, prioridad, categoria_id, dias, q } = req.query;
  if (req.query.mios === '1') { where.push('t.requester_id=?'); params.push(req.user.id); }

  if (STATUSES.includes(estado)) { where.push('t.status=?'); params.push(estado); }
  if (PRIORITIES.includes(prioridad)) { where.push('t.priority=?'); params.push(prioridad); }
  if (Number(categoria_id)) { where.push('t.category_id=?'); params.push(Number(categoria_id)); }
  if (Number(dias)) { where.push('t.updated_at >= NOW() - INTERVAL ? DAY'); params.push(Number(dias)); }
  if (q) {
    const idNum = Number(String(q).replace(/\D/g, ''));
    where.push(idNum ? '(t.subject LIKE ? OR t.id=?)' : 't.subject LIKE ?');
    params.push(`%${q}%`);
    if (idNum) params.push(idNum);
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 7);
  const w = where.join(' AND ');

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM tickets t WHERE ${w}`, params);
  const [rows] = await pool.query(
    `SELECT t.id, t.subject, t.status, t.priority, t.impact, t.created_at, t.updated_at,
            t.assigned_to, c.name AS category, a.name AS assigned_name, r.name AS requester_name
       FROM tickets t
       JOIN categories c ON c.id = t.category_id
       JOIN users r ON r.id = t.requester_id
       LEFT JOIN users a ON a.id = t.assigned_to
      WHERE ${w}
      ORDER BY t.updated_at DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );

  // Contadores para las tarjetas y pestañas (sobre todo el alcance del usuario, sin filtros)
  const [cnt] = await pool.query(
    `SELECT t.status, COUNT(*) AS n FROM tickets t WHERE ${sc.sql} GROUP BY t.status`,
    sc.params
  );
  const counts = { total: 0, open: 0, in_progress: 0, waiting_user: 0, resolved: 0, closed: 0 };
  cnt.forEach((c) => { counts[c.status] = Number(c.n); counts.total += Number(c.n); });

  res.json({
    data: rows.map((r) => ({ ...r, code: code(r.id) })),
    total: Number(total),
    page,
    pages: Math.ceil(total / limit),
    counts,
  });
});

// ---------- crear ticket (solicitante y admin) ----------
router.post('/', auth, requireRole('requester', 'admin'), upload.array('files', 5), async (req, res) => {
  const { subject, description, impact, priority } = req.body;
  const categoryId = Number(req.body.category_id);
  const assignedTo = Number(req.body.assigned_to);
  const notify = req.body.notify_email === undefined ? true : ['true', '1', 'on'].includes(String(req.body.notify_email));

  const fail = (status, error) => { cleanup(req.files); return res.status(status).json({ error }); };

  if (!subject?.trim() || !description?.trim() || !categoryId || !assignedTo ||
      !IMPACTS.includes(impact) || !PRIORITIES.includes(priority)) {
    return fail(400, 'Faltan campos obligatorios o son inválidos');
  }
  if (subject.length > 200) return fail(400, 'El asunto no puede superar 200 caracteres');
  if (description.length > 2000) return fail(400, 'La descripción no puede superar 2.000 caracteres');
  if (!(await validSupport(assignedTo, categoryId))) {
    return fail(400, 'La persona de soporte elegida no atiende esa categoría');
  }

  const [r] = await pool.query(
    `INSERT INTO tickets (subject, description, category_id, impact, priority, requester_id, assigned_to, notify_email)
     VALUES (?,?,?,?,?,?,?,?)`,
    [subject.trim(), description.trim(), categoryId, impact, priority, req.user.id, assignedTo, notify ? 1 : 0]
  );
  const id = r.insertId;

  for (const f of req.files || []) {
    await pool.query('INSERT INTO attachments (ticket_id, filename, stored_name) VALUES (?,?,?)', [
      id, f.originalname, f.filename,
    ]);
  }

  const t = await getTicket(id);
  await log(id, req.user.id, 'created', `Asignado a ${t.assigned_name}`);

  sendMail(
    t.assigned_email,
    `Nuevo ticket ${code(id)}: ${t.subject}`,
    `${t.requester_name} te envió un ticket (${t.category}, prioridad ${t.priority}).\n\n${t.description}\n\n${link(id)}`
  );

  res.status(201).json({ id, code: code(id) });
});

// ---------- detalle ----------
router.get('/:id', auth, loadTicket, async (req, res) => {
  const t = req.ticket;
  const [history] = await pool.query(
    `SELECT h.id, h.action, h.detail, h.created_at, u.name AS actor
       FROM ticket_history h JOIN users u ON u.id = h.actor_id
      WHERE h.ticket_id=? ORDER BY h.created_at, h.id`,
    [t.id]
  );
  const [comments] = await pool.query(
    `SELECT c.id, c.body, c.created_at, u.name AS author, u.role AS author_role
       FROM comments c JOIN users u ON u.id = c.author_id
      WHERE c.ticket_id=? ORDER BY c.created_at, c.id`,
    [t.id]
  );
  const [attachments] = await pool.query('SELECT id, filename, created_at FROM attachments WHERE ticket_id=?', [t.id]);

  const { requester_email, assigned_email, ...ticket } = t;
  res.json({ ...ticket, code: code(t.id), history, comments, attachments });
});

// ---------- descargar adjunto ----------
router.get('/:id/attachments/:attId', auth, loadTicket, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM attachments WHERE id=? AND ticket_id=?', [
    Number(req.params.attId), req.ticket.id,
  ]);
  if (!rows[0]) return res.status(404).json({ error: 'Adjunto no encontrado' });
  res.download(path.join(UPLOAD_DIR, rows[0].stored_name), rows[0].filename);
});

// ---------- cambiar estado ----------
router.patch('/:id/status', auth, loadTicket, async (req, res) => {
  const t = req.ticket;
  const { status, resolution_cause, resolution_fix } = req.body || {};
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Estado inválido' });
  if (status === t.status) return res.status(400).json({ error: 'El ticket ya está en ese estado' });

  const isStaff = req.user.role === 'admin' || req.user.role === 'support';
  if (!isStaff && !(status === 'closed' && t.status === 'resolved')) {
    return res.status(403).json({ error: 'Solo puedes cerrar un ticket que ya esté resuelto' });
  }

  if (status === 'resolved') {
    if (!resolution_cause?.trim() || !resolution_fix?.trim()) {
      return res.status(400).json({ error: 'Para resolver debes explicar qué sucedió y cómo lo arreglaste' });
    }
    await pool.query(
      'UPDATE tickets SET status=?, resolution_cause=?, resolution_fix=?, resolved_at=NOW(), resolved_by=? WHERE id=?',
      [status, resolution_cause.trim(), resolution_fix.trim(), req.user.id, t.id]
    );
  } else {
    await pool.query('UPDATE tickets SET status=? WHERE id=?', [status, t.id]);
  }
  await log(t.id, req.user.id, 'status_changed', `${t.status} → ${status}`);

  if (t.notify_email && req.user.id !== t.requester_id) {
    const extra = status === 'resolved'
      ? `\n\nQué sucedió: ${resolution_cause.trim()}\nCómo se solucionó: ${resolution_fix.trim()}`
      : '';
    sendMail(
      t.requester_email,
      `Ticket ${code(t.id)}: cambió a "${status}"`,
      `Tu ticket "${t.subject}" cambió de estado (${t.status} → ${status}).${extra}\n\n${link(t.id)}`
    );
  }
  res.json({ ok: true });
});

// ---------- reasignar (solo admin) ----------
router.patch('/:id/assign', auth, requireRole('admin'), loadTicket, async (req, res) => {
  const t = req.ticket;
  const to = Number(req.body?.assigned_to);
  if (!to || !(await validSupport(to, t.category_id))) {
    return res.status(400).json({ error: 'La persona elegida no atiende la categoría de este ticket' });
  }
  if (to === t.assigned_to) return res.status(400).json({ error: 'El ticket ya está asignado a esa persona' });

  await pool.query('UPDATE tickets SET assigned_to=? WHERE id=?', [to, t.id]);
  const [[n]] = await pool.query('SELECT name, email FROM users WHERE id=?', [to]);
  await log(t.id, req.user.id, 'reassigned', `${t.assigned_name || 'Sin asignar'} → ${n.name}`);

  sendMail(n.email, `Ticket ${code(t.id)} asignado a ti: ${t.subject}`,
    `Se te asignó un ticket de ${t.requester_name} (${t.category}).\n\n${link(t.id)}`);
  if (t.notify_email) {
    sendMail(t.requester_email, `Ticket ${code(t.id)}: nueva persona asignada`,
      `Tu ticket "${t.subject}" fue reasignado a ${n.name}.\n\n${link(t.id)}`);
  }
  res.json({ ok: true });
});

// ---------- comentarios ----------
router.post('/:id/comments', auth, loadTicket, async (req, res) => {
  const t = req.ticket;
  const body = (req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'El comentario no puede estar vacío' });
  if (t.status === 'closed') return res.status(400).json({ error: 'El ticket está cerrado' });

  await pool.query('INSERT INTO comments (ticket_id, author_id, body) VALUES (?,?,?)', [t.id, req.user.id, body]);
  await pool.query('UPDATE tickets SET updated_at=NOW() WHERE id=?', [t.id]);

  // Si el soporte estaba esperando respuesta y el solicitante responde, el ticket vuelve a "en proceso"
  if (req.user.id === t.requester_id && t.status === 'waiting_user') {
    await pool.query("UPDATE tickets SET status='in_progress' WHERE id=?", [t.id]);
    await log(t.id, req.user.id, 'status_changed', 'waiting_user → in_progress');
  }

  if (req.user.id === t.requester_id) {
    sendMail(t.assigned_email, `Nuevo comentario en ${code(t.id)}`, `${req.user.name} comentó:\n\n${body}\n\n${link(t.id)}`);
  } else if (t.notify_email) {
    sendMail(t.requester_email, `Nuevo comentario en ${code(t.id)}`, `${req.user.name} comentó:\n\n${body}\n\n${link(t.id)}`);
  }
  res.status(201).json({ ok: true });
});

module.exports = router;
