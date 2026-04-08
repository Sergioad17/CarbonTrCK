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

### `GET /records`

- Requiere token valido.
- Devuelve `items` con shape normalizado compatible con frontend.
- Soporta filtros opcionales: `from`, `to`, `category`, `scope`, `areaCode`, `campusCode`, `status`, `source`.
- Aplica filtro por organizacion y respeta `campusCode` y `areaAccess` del usuario autenticado.

### `POST /records`

- Requiere permiso `records:create`.
- Crea fila real en `records`.
- Inserta revision `1` en `record_revisions`.
- Inserta auditoria `records.create`.
- Acepta `fileIds` y los asocia en la misma transaccion.

### Reglas funcionales de `records`

- `factorId` es opcional.
- Se permite factor manual numerico aunque no exista un factor de catalogo.
- Si llega `factorId` y tambien llega `factor`, ambos deben coincidir.
- `source="Estimacion"` fuerza `status="est"` aunque el frontend mande otro valor.
- Se permite crear records sin evidencia.
- `record_files` es la fuente principal de evidencia asociada.
- `evidence_text` se mantiene como compatibilidad y puede coexistir con `record_files`.
- `PATCH /records/:id` sigue pospuesto en esta fase; por eso no se permite todavia editar factor ni archivos desde ese endpoint.
- Un usuario operativo no puede editar o asociar archivos a cualquier record: solo a records dentro de su organizacion y ademas respetando su `campusCode` y `areaAccess`.
- `deleted_at` no se usa como funcionalidad expuesta en esta fase; no se implementa delete mientras la UI no lo requiera.

### `PATCH /records/:id`

- Pospuesto formalmente en esta fase.
- No se expone todavia hasta cerrar lectura, captura transaccional y auditoria de creacion.

### `POST /files`

- Requiere token valido.
- Acepta `multipart/form-data` con un solo campo `file`.
- Acepta `kind`.
- Guarda metadata en `files` y persiste el binario en storage local de desarrollo.

### Reglas funcionales de `files`

- Limite actual por archivo: `10 MB`.
- MIME types permitidos:
  - `application/pdf`
  - `image/png`
  - `image/jpeg`
  - `image/webp`
  - `text/csv`
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- El nombre del archivo se sanitiza para storage local y solo conserva caracteres seguros.
- Se calcula `checksum_sha256` al subir el archivo.
- Por ahora no se aplica deduplicacion automatica por checksum; el checksum queda persistido para trazabilidad y posible limpieza futura.
- Un mismo archivo puede adjuntarse a varios records; lo que se evita es duplicar el mismo par `record_id + file_id`.
- Los archivos huerfanos subidos pero no asociados se permiten temporalmente en desarrollo.
- La politica actual para huerfanos es limpieza posterior; no se bloquea la subida por no venir asociada a un record en el mismo request.

### `GET /files/:id`

- Requiere token valido.
- Solo permite leer archivos de la misma organizacion.
- Devuelve el archivo con `Content-Type`, `Content-Length` y `Content-Disposition`.

### `POST /records/:id/files`

- Requiere permiso `records:update`.
- Asocia `fileIds` existentes a un `record`.
- Valida record existente, misma organizacion y acceso por campus/area.
- Devuelve el record actualizado con `evidenceFiles`.

### `GET /areas`

- Requiere token valido.
- Devuelve el catalogo oficial de areas de la organizacion.
- Por defecto solo incluye areas activas.
- Respeta `campusCode` y `areaAccess` del usuario autenticado.
- `includeInactive=true` solo se expone para perfiles con acceso administrativo.

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

Reglas vigentes:

- `001_init_postgresql.sql` es la base historica congelada.
- cada cambio nuevo de esquema debe entrar en una migracion incremental nueva.
- `database.sql` es el snapshot consolidado del esquema actual y no debe ser invocado desde `001`.

`database.sql` sigue siendo util para inicializacion limpia por snapshot, y `seed_auth.sql` agrega los datos demo de autenticacion en arranques nuevos.
