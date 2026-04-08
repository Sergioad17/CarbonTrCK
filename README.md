# CarbonTrCK

Plataforma web para monitoreo, trazabilidad y gestión de huella de carbono orientada a instituciones educativas. El repositorio ya incluye frontend, backend HTTP con autenticación y administración de usuarios, base de datos PostgreSQL, semillas demo y flujo con Docker Compose.

## Estado actual

- `frontend` funcional en React + Vite con landing pública, login, dashboard y módulos operativos.
- `backend` funcional en Express + PostgreSQL para autenticación, sesión, perfil y usuarios.
- `docker-compose.yml` listo para levantar `frontend`, `backend`, `postgres` y `pgadmin` opcional.
- Semillas iniciales disponibles para catálogos, autenticación y usuarios demo.
- Modo local aislado aún disponible para demos técnicas y desarrollo sin backend completo.

## Stack y versiones actuales

### Frontend

- React `18.3.1`
- React DOM `18.3.1`
- React Router DOM `6.28.0`
- Vite `5.4.11`
- `@vitejs/plugin-react` `4.3.4`
- Recharts `2.13.3`
- Three.js `0.161.0`
- `@react-three/fiber` `8.18.0`
- `@react-three/drei` `9.122.0`
- Lucide React `0.263.1`

### Backend

- Node.js sobre imagen Docker `20-alpine`
- Express `4.21.2`
- PostgreSQL cliente `pg` `8.13.1`
- JSON Web Token `9.0.2`
- bcryptjs `2.4.3`
- dotenv `16.4.5`
- pino `9.5.0`
- cors `2.8.5`

### Infraestructura local

- PostgreSQL `16-alpine`
- pgAdmin `8`
- Docker Compose con volumen persistente para base de datos

## Estructura del repositorio

```text
frontend/
backend/
backend/database/
docker-compose.yml
.env.example
README.md
```

## Qué hace hoy el proyecto

### Frontend

La aplicación incluye estas áreas funcionales:

- Landing pública con propuesta de valor, casos de uso y contenido visual.
- Login con sesión local o remota.
- Dashboard con KPIs, tendencias, distribución por scope, emisiones por área y actividad reciente.
- Emisiones.
- Scope 2: electricidad.
- Scope 1: combustible.
- Áreas.
- Metas.
- Reportes.
- Catálogos de factores.
- Catálogos de equipos.
- Usuarios.
- Configuración.
- Perfil.

### Backend implementado

El backend actual expone:

- `GET /health`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `GET /users`
- `GET /users/roles`
- `POST /users`
- `PATCH /users/:id`
- `PATCH /users/:id/status`
- `POST /users/:id/password-reset`
- `PATCH /profile/password`

Además ya incluye:

- JWT de acceso y refresh.
- Rotación de refresh tokens.
- RBAC por roles y permisos.
- Auditoría en base de datos.
- Revocación de sesiones al cambiar o resetear contraseña.
- Semillas de usuarios y catálogos base.
- Pruebas de integración para auth y users en `backend/tests/auth-users.test.js`.

## Modos de operación

El frontend trabaja con estas variables:

- `VITE_LOCAL_MODE=true`: modo local aislado.
- `VITE_LOCAL_MODE=false` y `VITE_API_URL` definido: modo backend estricto.

Regla real de ejecución:

```text
BACKEND_MODE = Boolean(VITE_API_URL) && !VITE_LOCAL_MODE
```

### Modo local

Cuando `VITE_LOCAL_MODE=true`:

- la app usa `localStorage` para sesión y varios módulos,
- algunas pantallas tienen semillas locales,
- otras dependen de datos que el usuario capture durante la sesión.

Pantallas con experiencia local útil desde instalación limpia:

- `Dashboard`
- `Emisiones`
- `Scope Electricidad`
- `Configuración`
- `Perfil`

Pantallas que dependen más de datos guardados localmente:

- `Scope Combustible`
- `Áreas`
- `Reportes`
- `Metas`
- `Factores`
- `Equipos`
- `Usuarios`
- `Notificaciones`
- Solicitudes de cambio de perfil

### Modo backend

Cuando `VITE_LOCAL_MODE=false` y `VITE_API_URL` está definido:

- el frontend usa backend como fuente de verdad,
- no hace fallback silencioso a `localStorage`,
- si un endpoint no existe o no devuelve datos, la vista afectada puede quedar vacía o fallar.

Hoy el backend real cubre autenticación, perfil y usuarios. Otros módulos del frontend siguen requiriendo contratos backend adicionales si se quiere operación remota completa. El detalle de esos contratos está documentado en `backend/BACKEND_READINESS.md`.

## Requisitos

- Node.js `20` recomendado
- npm `9` o superior
- Docker Desktop opcional para flujo con contenedores
- Navegador moderno como Chrome, Edge o Firefox

## Variables de entorno

El proyecto usa un `.env` raíz. Existe un ejemplo en `.env.example`.

Variables incluidas actualmente:

```env
VITE_API_URL=http://localhost:3001
VITE_LOCAL_MODE=false

PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://carbontrack_app:change_this_password@postgres:5432/carbontrack
JWT_ACCESS_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_another_long_random_secret
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
APP_BASE_URL=http://localhost:3001
BCRYPT_ROUNDS=10
FORGOT_PASSWORD_TOKEN_TTL=30m

POSTGRES_DB=carbontrack
POSTGRES_USER=carbontrack_app
POSTGRES_PASSWORD=change_this_password

PGADMIN_DEFAULT_EMAIL=admin@carbontrack.local
PGADMIN_DEFAULT_PASSWORD=cambia_la_contraseña_tiene_que_ser_igual_a_la_que_hay_en_POSTGRES_PASSWORD
```

Notas:

- `backend` soporta cargar `/.env` y también `backend/.env.local` si decides correrlo fuera de Docker.
- Si corres backend local sin contenedor, normalmente `DATABASE_URL` debe apuntar a `localhost:5432` y no a `postgres`.
- El backend falla explícitamente si faltan variables críticas.

## Instalación rápida

Instala dependencias por separado:

```bash
cd frontend
npm install

cd ../backend
npm install
```

Después crea el `.env` raíz:

```bash
copy .env.example .env
```

## Ejecutar con Docker

Servicios disponibles:

- `frontend`: `http://localhost:3000`
- `backend`: `http://localhost:3001`
- `postgres`: `localhost:5432`
- `pgadmin` con perfil `tools`: `http://localhost:5050`

Primer arranque:

```bash
copy .env.example .env
docker compose up --build
```

Con pgAdmin:

```bash
docker compose --profile tools up --build
```

Detalles importantes:

- La base se inicializa con:
  - `backend/database/database.sql`
  - `backend/database/seed_catalogs.sql`
  - `backend/database/seed_auth.sql`
- Esa inicialización corre al crear el volumen por primera vez.
- Si necesitas reinicializar desde cero, elimina el volumen `postgres_data`.

## Ejecutar sin Docker

### Frontend

```bash
copy .env.example .env
cd frontend
npm run dev
```

### Backend

Con PostgreSQL disponible y variables correctas:

```bash
cd backend
npm run dev
```

Puertos por defecto:

- frontend: `3000`
- backend: `3001`

## Scripts disponibles

### Frontend

```bash
npm run dev
npm run build
npm run preview
```

### Backend

```bash
npm run dev
npm run start
npm run test
```

## Usuarios demo actuales

Los usuarios semilla en base de datos son:

- `admin@itsmante.edu.mx / admin123A`
- `ana@itsmante.edu.mx / captura1A`
- `director@itsmante.edu.mx / consulta1A`

Importante:

- estas credenciales corresponden al backend y a `seed_auth.sql`,
- son distintas a algunas contraseñas antiguas que todavía aparecen en documentación vieja.

## Base de datos

La carpeta `backend/database/` contiene:

- esquema consolidado,
- migraciones SQL,
- semillas,
- documentación del modelo y operación.

Archivos clave:

- `backend/database/database.sql`
- `backend/database/seed_catalogs.sql`
- `backend/database/seed_auth.sql`
- `backend/database/migrations/001_init_postgresql.sql`
- `backend/database/migrations/002_auth_sessions_and_password_reset_tokens.sql`

## Documentación relacionada

- `backend/README.md`: detalles del backend, auth, RBAC y errores.
- `backend/BACKEND_READINESS.md`: contratos pendientes para integrar todos los módulos del frontend con backend.
- `backend/database/README.md`: detalles del esquema y operación de la BD.
- `DOCKER_WORKFLOW.md`: flujo complementario de trabajo con Docker.

## Estructura funcional principal

- `frontend/src/App.jsx`: enrutamiento principal.
- `frontend/src/pages/`: vistas principales del producto.
- `frontend/src/pages/Landing/`: landing pública.
- `frontend/src/api/`: capa de integración con backend y modo local.
- `frontend/src/lib/`: stores locales y utilidades.
- `backend/src/app.js`: configuración de Express.
- `backend/src/routes/index.js`: registro de rutas.
- `backend/src/domains/`: dominios de auth, profile y users.
- `backend/src/shared/`: configuración, middleware, utilidades, errores y acceso a BD.

## Estado de integración

El proyecto ya no es solo un prototipo visual:

- tiene frontend operativo,
- tiene backend real para autenticación y administración de usuarios,
- tiene base de datos y semillas funcionales,
- pero todavía hay módulos del frontend que requieren endpoints backend adicionales para una operación remota completa.

Si quieres saber exactamente qué falta para cerrar toda la integración, revisa `backend/BACKEND_READINESS.md`.

## Solución de problemas

Si algo no arranca:

1. Verifica Node con `node -v`.
2. Verifica npm con `npm -v`.
3. Confirma que `.env` exista en la raíz.
4. Reinstala dependencias con `npm install` en `frontend` y `backend`.
5. Si usas Docker, reconstruye con `docker compose up --build`.
6. Si la base ya tenía datos viejos y necesitas reinicio limpio, elimina el volumen `postgres_data`.

Si el frontend abre pero algunas pantallas no muestran datos:

1. revisa si estás en `VITE_LOCAL_MODE=true` o en modo backend,
2. confirma que `VITE_API_URL` apunte al backend correcto,
3. recuerda que no todos los módulos tienen fallback local cuando el frontend está en modo backend estricto.
