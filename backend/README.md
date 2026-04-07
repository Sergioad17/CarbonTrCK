# CarbonTrCK Backend

Backend HTTP para autenticacion, sesion, RBAC y administracion de usuarios sobre PostgreSQL.

## Variables de entorno

Archivos soportados al arrancar:

- `.env` en la raiz del repo: pensado para `docker compose`, usa `DATABASE_URL=...@postgres:5432/...`.
- `backend/.env.local`: pensado para correr el backend directo desde tu maquina con `npm run dev` o `npm start`, normalmente usa `DATABASE_URL=...@localhost:5432/...`.

Referencia:

- copiar `/.env.example` a `/.env` para Docker
- copiar `/backend/.env.local.example` a `/backend/.env.local` para backend local

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_TTL`
- `JWT_REFRESH_TTL`
- `APP_BASE_URL`
- `BCRYPT_ROUNDS`
- `FORGOT_PASSWORD_TOKEN_TTL`

El arranque falla de forma explicita si falta una variable critica o si `PORT` / `BCRYPT_ROUNDS` son invalidos.

## Estrategia JWT

- `access token`: corto, para `Authorization: Bearer`.
- `refresh token`: persistido en `auth_sessions` con hash SHA-256.
- `refresh`: rota la sesion, revoca el token anterior y emite un nuevo par.
- `revocacion`: desactivacion de usuario, reset de password y cambio de password propio revocan sesiones activas.
- `forgot-password`: genera token temporal persistido en `password_reset_tokens`; por ahora se deja lista la interfaz real y se registra un `resetPreviewUrl` en logs mientras no exista mailer.

## RBAC

- Roles leidos desde `roles`.
- Asignaciones desde `user_roles`.
- Permisos efectivos desde `role_permissions` + `permissions`.
- Acceso a areas desde `user_area_access`.
- Prioridad de rol principal: `admin` > `directivo` > `operativo` > resto alfabetico.
- `GET /users` y `GET /users/roles`: `admin` o `directivo`.
- Mutaciones de usuarios: permiso `users:manage`.

## Shape de usuario

Todos los endpoints devuelven el mismo shape normalizado:

```json
{
  "id": "",
  "numericId": "",
  "firstName": "",
  "paternalLastName": "",
  "maternalLastName": "",
  "fullName": "",
  "email": "",
  "role": "admin",
  "roleKey": "admin",
  "campusCode": "CAMPUS-CT",
  "areaAccess": { "mode": "all", "areaCodes": [] },
  "isActive": true,
  "lastLoginAt": null,
  "createdAt": null,
  "updatedAt": null,
  "notes": ""
}
```

## Catalogo de errores

- `400 INVALID_INPUT`
- `401 UNAUTHENTICATED`, `INVALID_ACCESS_TOKEN`, `INVALID_REFRESH_TOKEN`, `INVALID_CREDENTIALS`, `USER_INACTIVE`
- `403 FORBIDDEN`
- `404 NOT_FOUND`
- `409 CONFLICT`, `REFERENCE_CONFLICT`, `LAST_ADMIN_CONFLICT`, `SELF_DEACTIVATION_FORBIDDEN`
- `422 VALIDATION_ERROR`, `INVALID_EMAIL`, `INVALID_PASSWORD`, `INVALID_CAMPUS`, `INVALID_ROLE`, `INVALID_AREA_ACCESS`
- `500 INTERNAL_SERVER_ERROR`, `CONFIG_MISSING`, `CONFIG_INVALID`

Respuesta comun:

```json
{
  "code": "FORBIDDEN",
  "message": "You do not have the required permission.",
  "details": null,
  "requestId": "..."
}
```

## Endpoints

### `GET /health`

```json
{
  "ok": true,
  "service": "carbontrack-backend"
}
```

### `POST /auth/login`

Request:

```json
{
  "email": "admin@itsmante.edu.mx",
  "password": "admin123A"
}
```

Response:

```json
{
  "token": "<access-token>",
  "refreshToken": "<refresh-token>",
  "user": {
    "id": "...",
    "roleKey": "admin",
    "campusCode": "CAMPUS-CT"
  }
}
```

### `GET /auth/me`

Requiere token valido y reconstruye al usuario desde BD.

### `POST /auth/refresh`

Request:

```json
{
  "refreshToken": "<refresh-token>"
}
```

Response:

```json
{
  "token": "<new-access-token>",
  "refreshToken": "<new-refresh-token>"
}
```

### `POST /auth/forgot-password`

Request:

```json
{
  "email": "admin@itsmante.edu.mx"
}
```

Response ciega:

```json
{
  "ok": true,
  "message": "If the account exists, password recovery instructions will be sent."
}
```

### `GET /users`

Filtros soportados: `isActive`, `role`, `campusCode`, `search`.

### `GET /users/roles`

Response:

```json
{
  "roles": [
    { "key": "admin", "label": "Admin" },
    { "key": "directivo", "label": "Directivo" },
    { "key": "operativo", "label": "Operativo" }
  ]
}
```

### `POST /users`

Request:

```json
{
  "firstName": "Luisa",
  "paternalLastName": "Perez",
  "maternalLastName": "Diaz",
  "fullName": "Luisa Perez Diaz",
  "email": "luisa@itsmante.edu.mx",
  "role": "operativo",
  "campusCode": "CAMPUS-CT",
  "areaAccess": { "mode": "custom", "areaCodes": ["ADM"] },
  "isActive": true,
  "notes": "Alta inicial"
}
```

Response:

```json
{
  "user": { "id": "..." },
  "temporaryPassword": "CT-..."
}
```

### `PATCH /users/:id`

Actualiza datos base, rol, campus, notas y acceso a areas.

### `PATCH /users/:id/status`

```json
{
  "isActive": false
}
```

### `POST /users/:id/password-reset`

```json
{
  "ok": true,
  "temporaryPassword": "CT-..."
}
```

### `PATCH /profile/password`

```json
{
  "currentPassword": "admin123A",
  "nextPassword": "NuevaClave123"
}
```

## Auditoria

Se escribe en `audit_events` para:

- `auth.login.success`
- `auth.login.failure`
- `auth.login.inactive_user`
- `auth.refresh.failure`
- `auth.forgot_password.requested`
- `users.create`
- `users.update`
- `users.status_change`
- `users.password_reset`
- `profile.password_change`

Detalles relevantes ya cubiertos:

- login fallido por password incorrecta
- login fallido por email inexistente
- login con usuario inactivo
- refresh token fallido
- forgot password solicitado

## Datos semilla

`backend/database/seed_auth.sql` crea:

- organizacion demo
- campus `CAMPUS-CT`
- areas `ADM`, `LAB`, `PLANTA`
- roles `Admin`, `Directivo`, `Operativo`
- usuarios demo:
  - `admin@itsmante.edu.mx / admin123A`
  - `ana@itsmante.edu.mx / captura1A`
  - `director@itsmante.edu.mx / consulta1A`

## Migraciones

Migraciones disponibles:

- `backend/database/migrations/001_init_postgresql.sql`
- `backend/database/migrations/002_auth_sessions_and_password_reset_tokens.sql`

`database.sql` sigue siendo el esquema consolidado para inicializacion limpia, y `seed_auth.sql` agrega los datos demo de autenticacion en arranques nuevos.
