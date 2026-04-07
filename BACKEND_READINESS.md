# Backend Readiness

## Modos de operacion

- `VITE_API_URL` configurado: el frontend opera en modo backend estricto y `src/api` es la unica capa autorizada para auth, persistencia y sincronizacion.
- `VITE_LOCAL_MODE=true`: el frontend opera en modo local aislado solo para desarrollo.
- `VITE_API_URL` ausente en desarrollo: el frontend puede entrar a modo local tecnico, pero este modo no debe considerarse fuente de verdad para integracion real.

Regla efectiva de runtime:

- `BACKEND_MODE = Boolean(VITE_API_URL) && !VITE_LOCAL_MODE`.
- Si `VITE_LOCAL_MODE=false` y `VITE_API_URL` existe, el frontend asume backend obligatorio.
- Si `VITE_LOCAL_MODE=false` pero un endpoint falla, la vista afectada no hace fallback silencioso a `localStorage`.

## Estado actual del frontend

- Los flujos principales ya no usan delays ficticios para simular red.
- En modo backend, `src/api` ya no cae silenciosamente a stores locales ni `localStorage`.
- Si falta un endpoint en modo backend, el frontend falla explicitamente y eso debe tratarse como contrato backend faltante.
- El modo local sigue existiendo, pero queda aislado para desarrollo y pruebas tecnicas.

## Comportamiento confirmado por pantalla

### En `VITE_LOCAL_MODE=true`

- `Dashboard`: usa actividad local base, pero sus KPIs y graficas principales dependen de registros locales guardados.
- `Emisiones`: usa `SEED_RECORDS` si no hay registros persistidos.
- `Scope Electricidad`: usa `SEED_RECORDS` si no hay registros persistidos.
- `Scope Combustible`: solo muestra datos si existen registros locales de combustible.
- `Areas`: deriva datos desde registros locales; no tiene semilla propia.
- `Reportes`: deriva datos desde registros locales; no tiene semilla propia.
- `Metas`: usa `localStorage`; no tiene semillas por defecto.
- `Factores`: usa `localStorage`; no tiene semillas por defecto.
- `Equipos`: usa `localStorage`; no tiene semillas por defecto.
- `Usuarios`: usa `localStorage`; no tiene usuarios semilla, aunque el login local si puede crear sesion tecnica.
- `Settings`: siempre puede resolver valores por defecto locales.
- `Perfil`: puede operar con sesion local y settings locales.

### En `VITE_LOCAL_MODE=false`

- `Dashboard` necesita `GET /records` y `GET /dashboard/activity`.
- `Emisiones` necesita `GET /records`.
- `Scope Electricidad` necesita `GET /records`.
- `Scope Combustible` necesita `GET /records`.
- `Areas` necesita `GET /records` hoy; mas adelante conviene catalogo propio.
- `Reportes` necesita `GET /records`.
- `Metas` necesita `GET /targets`, `GET /actions` y `GET /records`.
- `Factores` necesita `GET /factors`, `GET /factors/default`, `GET /factors/:id/usage-count` y mutaciones relacionadas.
- `Equipos` necesita `GET /equipment` y normalmente `GET /factors/default`.
- `Usuarios` necesita `GET /users` y `GET /users/roles`.
- `Settings` necesita `GET /settings`.
- `Perfil` depende de sesion valida y de los modulos remotos asociados.

Conclusion operativa:

- `VITE_LOCAL_MODE=false` no significa "mostrar informacion en todos los apartados".
- Significa "leer solo backend". Si backend no implementa el contrato o no tiene datos, la pantalla queda vacia o falla.

## Criterios de integracion

- El acceso autenticado viaja por `src/api/httpClient.js` con `Authorization: Bearer <token>`.
- Si el backend entrega `refreshToken`, el frontend intentara `POST /auth/refresh` ante `401`.
- Cuando `VITE_API_URL` esta configurado, backend pasa a ser la fuente de verdad de usuarios, records, files, settings, notifications, dashboard activity, targets, actions, factors, equipment y profile change requests.
- Las respuestas del backend deben respetar payloads consistentes. El frontend acepta `item/items`, `record/records`, `user/users`, `notification/notifications`, `request/requests` y `data`, pero conviene estandarizar.

## Contratos requeridos

### Auth

#### `POST /auth/login`

Request:

```json
{
  "email": "usuario@dominio.com",
  "password": "secret"
}
```

Response esperada:

```json
{
  "token": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "usr_123",
    "email": "usuario@dominio.com",
    "firstName": "Ada",
    "paternalLastName": "Lovelace",
    "maternalLastName": "",
    "fullName": "Ada Lovelace",
    "role": "admin",
    "campusCode": "CAMPUS-CT",
    "areaAccess": { "mode": "all", "areaCodes": [] },
    "isActive": true,
    "lastLoginAt": "2026-04-06T17:00:00.000Z",
    "notes": ""
  }
}
```

#### `GET /auth/me`

Headers:

```http
Authorization: Bearer <token>
```

Response esperada:

```json
{
  "user": {
    "id": "usr_123",
    "email": "usuario@dominio.com",
    "fullName": "Ada Lovelace",
    "role": "admin",
    "campusCode": "CAMPUS-CT",
    "areaAccess": { "mode": "all", "areaCodes": [] },
    "isActive": true
  }
}
```

#### `POST /auth/refresh`

Request:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Response esperada:

```json
{
  "token": "jwt-access-token-renovado",
  "refreshToken": "jwt-refresh-token-opcional"
}
```

#### `POST /auth/forgot-password`

Request:

```json
{
  "email": "usuario@dominio.com"
}
```

Response esperada:

```json
{
  "ok": true,
  "message": "Si el correo existe, se envio el enlace."
}
```

### Usuarios y perfil

#### `GET /users`

Response:

```json
{
  "items": [
    {
      "id": "usr_123",
      "email": "usuario@dominio.com",
      "firstName": "Ada",
      "paternalLastName": "Lovelace",
      "maternalLastName": "",
      "fullName": "Ada Lovelace",
      "role": "admin",
      "campusCode": "CAMPUS-CT",
      "areaAccess": { "mode": "all", "areaCodes": [] },
      "isActive": true
    }
  ]
}
```

#### `GET /users/roles`

Response:

```json
{
  "items": [
    { "key": "admin", "label": "Administrador" },
    { "key": "directivo", "label": "Directivo" },
    { "key": "operativo", "label": "Operativo" }
  ]
}
```

#### `POST /users`

#### `PATCH /users/:id`

#### `PATCH /users/:id/status`

#### `POST /users/:id/password-reset`

- Deben aceptar y devolver el mismo shape normalizado de usuario.
- `password-reset` puede responder solo `{ "ok": true }`.

#### `PATCH /profile/password`

Request:

```json
{
  "currentPassword": "old-secret",
  "nextPassword": "new-secret"
}
```

Response:

```json
{
  "ok": true
}
```

#### `GET /profile-change-requests`

#### `POST /profile-change-requests`

#### `PATCH /profile-change-requests/:id`

- Deben persistir solicitudes de cambio de perfil como fuente remota de verdad cuando el frontend esta en modo backend.

### Registros y evidencias

#### `GET /records`

Response:

```json
{
  "items": [
    {
      "id": "rec_123",
      "dateISO": "2026-04-06",
      "scope": "scope2",
      "metric": "electricity_consumption",
      "area": "Laboratorio",
      "areaCode": "Laboratorio",
      "campusCode": "CAMPUS-CT",
      "category": "electricidad",
      "activity": "Consumo electrico",
      "activityText": "Consumo electrico",
      "value": 1200,
      "unit": "kWh",
      "factor": 0.455,
      "factorId": "fac_123",
      "co2e_kg": 546,
      "co2e_t": 0.546,
      "status": "real",
      "isEstimated": false,
      "source": "manual",
      "by": "Usuario",
      "note": "",
      "hasEvidence": true,
      "evidenceFileId": "file_1",
      "evidenceFiles": [
        {
          "id": "file_1",
          "fileName": "factura.pdf",
          "name": "factura.pdf",
          "mimeType": "application/pdf",
          "sizeBytes": 12345,
          "url": "https://backend/files/file_1",
          "purpose": "evidence"
        }
      ]
    }
  ]
}
```

#### `POST /records`

Request:

```json
{
  "dateISO": "2026-04-06",
  "scope": "scope2",
  "metric": "electricity_consumption",
  "area": "Laboratorio",
  "areaCode": "Laboratorio",
  "campusCode": "CAMPUS-CT",
  "category": "electricidad",
  "activity": "Consumo electrico",
  "activityText": "Consumo electrico",
  "value": 1200,
  "unit": "kWh",
  "factor": 0.455,
  "factorId": "fac_123",
  "co2e_kg": 546,
  "co2e_t": 0.546,
  "status": "real",
  "isEstimated": false,
  "source": "manual",
  "by": "Usuario",
  "note": "",
  "hasEvidence": true,
  "evidenceFileId": "file_1",
  "fileIds": ["file_1"]
}
```

Response:

```json
{
  "item": {
    "id": "rec_123"
  }
}
```

#### `PATCH /records/:id`

- Solo necesaria si backend quiere permitir actualizacion directa de registros.

#### `POST /files` o `POST /uploads`

- Debe aceptar `multipart/form-data`.
- Debe devolver al menos `{ "id": "file_1", "name": "factura.pdf", "url": "..." }`.

#### `POST /records/:id/files`

Request:

```json
{
  "fileIds": ["file_1", "file_2"]
}
```

Response:

```json
{
  "item": {
    "id": "rec_123",
    "evidenceFiles": [
      { "id": "file_1", "name": "factura.pdf", "url": "..." }
    ]
  }
}
```

### Catalogos y planeacion

#### Factores

- `GET /factors`
- `POST /factors`
- `PATCH /factors/:id`
- `GET /factors/default`
- `GET /factors/:id/usage-count`
- `PATCH /factors/:id/default`
- `PATCH /factors/:id/status`
- `POST /factors/:id/new-version`

#### Equipos

- `GET /equipment`
- `POST /equipment`
- `PATCH /equipment/:id`
- `PATCH /equipment/:id/status`
- `POST /equipment/:id/duplicate`

#### Metas y acciones

- `GET /targets`
- `POST /targets`
- `PATCH /targets/:id`
- `PATCH /targets/:id/status`
- `GET /actions`
- `POST /actions`
- `PATCH /actions/:id`

#### Areas

- `GET /areas`

Todas estas rutas deben usar payloads consistentes con los shapes normalizados actuales de `src/api/*`.

### Dashboard, settings y notificaciones

#### Dashboard

- `GET /dashboard/activity`
- `PUT /dashboard/activity`

Notas:

- La actividad reciente del dashboard tiene semilla local solo cuando `VITE_LOCAL_MODE=true`.
- En modo backend no existe semilla ni fallback local para `GET /dashboard/activity`.

#### Settings

- `GET /settings`
- `PUT /settings`

Notas:

- En local siempre existen valores por defecto.
- En backend, settings se resuelve remotamente y solo conserva cache en memoria.

#### Notificaciones

- `GET /notifications`
- `POST /notifications`
- `PATCH /notifications/:id`
- `POST /notifications/mark-all-read`
- `DELETE /notifications/archived`

Estas rutas ya operan remoto-first en modo backend. El frontend solo conserva cache en memoria o sincronizacion local cuando esta explicitamente en `LOCAL_MODE`.

## Shapes normalizados esperados

### Usuario

```json
{
  "id": "usr_123",
  "numericId": "12",
  "firstName": "Ada",
  "paternalLastName": "Lovelace",
  "maternalLastName": "",
  "fullName": "Ada Lovelace",
  "email": "usuario@dominio.com",
  "role": "admin",
  "roleKey": "admin",
  "campusCode": "CAMPUS-CT",
  "areaAccess": { "mode": "all", "areaCodes": [] },
  "isActive": true,
  "lastLoginAt": "2026-04-06T17:00:00.000Z",
  "createdAt": "2026-04-01T10:00:00.000Z",
  "updatedAt": "2026-04-06T17:00:00.000Z",
  "notes": ""
}
```

### Notificacion

```json
{
  "id": "not_123",
  "type": "system",
  "title": "Registro guardado",
  "message": "Se registro una emision.",
  "link": "/emisiones",
  "status": "unread",
  "createdAt": "2026-04-06T17:00:00.000Z",
  "meta": {}
}
```

### Solicitud de cambio de perfil

```json
{
  "id": "req_123",
  "type": "email",
  "status": "pending",
  "createdAt": "2026-04-06T17:00:00.000Z",
  "updatedAt": "2026-04-06T17:00:00.000Z",
  "requestedBy": {
    "id": "usr_123"
  },
  "payload": {},
  "notes": ""
}
```

## Decisiones backend pendientes

### Flujo final de recuperacion de contrasena

- El frontend ya invoca `POST /auth/forgot-password`.
- Falta definir si la respuesta siempre sera ciega por seguridad o si el backend distinguira errores validables.

### Dashboard activity

- Conviene fijar un shape definitivo con `id`, `title`, `description`, `type`, `createdAt`, `link`, `meta`.

### Areas

- El frontend hoy puede derivar areas desde records, pero conviene formalizar `GET /areas` para catalogo oficial.

### Semillas locales

- Actualmente solo `Emisiones` y `Scope Electricidad` contienen `SEED_RECORDS`.
- `Dashboard` contiene `BASE_ACTIVITY` para actividad reciente local.
- La ausencia de semillas en otros modulos es intencional en el estado actual del frontend.

## Estado final

- No quedan bloqueos tecnicos relevantes en el frontend para entregar a backend.
- Lo que falta a partir de este punto es que backend implemente y respete los contratos aqui documentados.
