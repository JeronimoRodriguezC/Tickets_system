# Sistema de tickets de soporte IT

Backend (Node/Express + MySQL + JWT) listo para usar con Docker. El frontend en React se agrega en `frontend/`.

## Arranque

```bash
cp .env.example .env      # edita contraseñas, JWT_SECRET y datos del admin inicial
docker compose up --build
```

- API: http://localhost:3000/api (health: `/api/health`)
- Bandeja de correos de prueba (Mailpit): http://localhost:8025
- Al primer arranque se crean el admin inicial (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) y las categorías base.
- Para correos reales, cambia las variables `SMTP_*` y `MAIL_FROM` en `.env` (y quita el servicio `mailpit` si quieres).

## Roles

| Rol | Puede |
|---|---|
| `requester` | Crear tickets; ver el historial solo de los suyos; comentar; cerrar un ticket resuelto |
| `support` | Ver los tickets que le asignaron; cambiar estado (resolver exige causa y solución); comentar |
| `admin` | Ver todos los tickets; crear tickets; crear/editar usuarios; reasignar tickets; gestionar categorías y especialidades |

No hay registro público: solo el admin crea usuarios.

## Endpoints (todos bajo `/api`, con `Authorization: Bearer <token>` salvo login)

| Método y ruta | Quién | Descripción |
|---|---|---|
| `POST /auth/login` | todos | Devuelve `token` y `user` |
| `GET /auth/me` | autenticado | Usuario actual |
| `POST /auth/change-password` | autenticado | Cambiar contraseña propia |
| `GET /categories` | autenticado | Lista de categorías |
| `POST /categories`, `PATCH /categories/:id` | admin | Crear / renombrar |
| `GET /support-users?category_id=` | autenticado | Soporte que atiende esa categoría (dropdown) |
| `GET /users`, `POST /users`, `PATCH /users/:id` | admin | Gestión de usuarios y categorías de soporte |
| `GET /tickets` | autenticado | Filtrado por rol. Query: `estado`, `prioridad`, `categoria_id`, `dias`, `q`, `mios=1` (solo los que envié yo), `page`, `limit` (7 por defecto). Incluye `counts` |
| `POST /tickets` | requester, admin | `multipart/form-data`: `subject`, `category_id`, `assigned_to`, `impact`, `priority`, `description`, `notify_email`, `files[]` |
| `GET /tickets/:id` | con acceso | Detalle + historial + comentarios + adjuntos |
| `GET /tickets/:id/attachments/:attId` | con acceso | Descarga de adjunto |
| `PATCH /tickets/:id/status` | support, admin (requester solo `closed`) | `status`; para `resolved`: `resolution_cause` y `resolution_fix` |
| `PATCH /tickets/:id/assign` | admin | `assigned_to` (debe atender la categoría del ticket) |
| `POST /tickets/:id/comments` | con acceso | `body` |

Valores: `status` = open, in_progress, waiting_user, resolved, closed · `priority` = low, medium, high, critical · `impact` = low, medium, high.

## Notas de diseño

- Si el solicitante comenta mientras el ticket está en `waiting_user`, vuelve solo a `in_progress`.
- Los correos se envían al crear, cambiar de estado, reasignar y comentar (al solicitante solo si marcó "Notificarme por correo").
- Para descargar adjuntos desde el frontend hay que usar `fetch` con el token y convertir a blob (un enlace simple no envía el header).

## Frontend (React + Vite + Tailwind)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173 (las llamadas a /api se redirigen al backend en el puerto 3000)
```

Si cambiaste `BACKEND_PORT`, arranca con `API_URL=http://localhost:PUERTO npm run dev`.

Pantallas incluidas: login, Crear ticket (con el dropdown "Asignado a" filtrado por categoría) y Mis tickets / Tickets asignados / Todos los tickets (según el rol).
