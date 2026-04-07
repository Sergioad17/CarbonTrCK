# CarbonTrCK

Aplicacion web para monitoreo y trazabilidad de huella de carbono orientada a instituciones educativas. El repositorio esta organizado para separar frontend, backend y base de datos desde el inicio.

## Estructura del repositorio

```text
/frontend
/backend
/backend/database
/backend/src
docker-compose.yml
README.md
```

## Modos de operacion

El frontend puede trabajar en dos modos:

- `VITE_LOCAL_MODE=true`: modo local aislado para desarrollo y demo tecnica.
- `VITE_LOCAL_MODE=false` con `VITE_API_URL` definido: modo backend estricto.

Comportamiento real:

- En modo local, la aplicacion usa `localStorage` para sesion, registros y varios modulos.
- En modo backend, `frontend/src/api` deja de caer a `localStorage`. Si falta un endpoint o no responde, la vista afectada queda vacia o muestra error.
- `VITE_LOCAL_MODE=false` no garantiza datos por si solo. Solo muestra informacion si el backend implementa los contratos esperados y devuelve datos.

## Que se necesita para arrancar

- Node.js 18 o superior
- npm 9 o superior
- Un navegador moderno como Chrome, Edge o Firefox

Recomendado:

- Node.js 20 LTS

## Tecnologias principales

- React 18
- Vite 5
- React Router DOM
- Recharts
- Three.js
- React Three Fiber / Drei

## Instalacion

Desde la carpeta del frontend:

```bash
cd frontend
npm install
```

Para Docker, crea el archivo raiz desde el ejemplo:

```bash
copy .env.example .env
```

## Trabajo con Docker

El repo ya incluye una base para levantar frontend y PostgreSQL con Docker Compose.

Servicios incluidos:

- `frontend`: Vite en `http://localhost:3000`
- `postgres`: PostgreSQL 16 en `localhost:5432`
- `pgadmin`: opcional, disponible con el perfil `tools` en `http://localhost:5050`

Primer arranque:

```bash
copy .env.example .env
docker compose up --build
```

Si quieres abrir pgAdmin tambien:

```bash
docker compose --profile tools up --build
```

Notas importantes:

- La base se inicializa automaticamente con `backend/database/database.sql` y `backend/database/seed_catalogs.sql`.
- La inicializacion solo corre la primera vez que se crea el volumen `postgres_data`.
- Si necesitas reinicializar la BD desde cero, elimina el volumen manualmente antes de volver a levantar el stack.
- En equipo, cada integrante trabaja en su rama y usa su propio `.env`.

## Como arrancar en desarrollo

```bash
copy .env.example .env
cd frontend
npm run dev
```

La aplicacion se levanta en:

```text
http://localhost:3000
```

Notas de arranque:

- Vite esta configurado para abrir el navegador automaticamente.
- Puedes ejecutar el proyecto sin backend usando `VITE_LOCAL_MODE=true`.
- Si vas a integrar backend, define `VITE_API_URL` y usa `VITE_LOCAL_MODE=false`.
- En modo local, la sesion y parte de la informacion se almacenan en `localStorage`.
- Si vas a correr el backend fuera de Docker, usa tambien `backend/.env.local` basado en `backend/.env.local.example`.

Ejemplo de `.env` para modo local:

```env
VITE_LOCAL_MODE=true
VITE_API_URL=http://localhost:3001
```

Ejemplo de `.env` para modo backend:

```env
VITE_LOCAL_MODE=false
VITE_API_URL=http://localhost:3001
```

## Disponibilidad de datos en modo local

Cuando `VITE_LOCAL_MODE=true`, las pantallas no se comportan todas igual.

Pantallas con datos visibles desde una instalacion limpia:

- `Emisiones`: usa registros semilla (`SEED_RECORDS`).
- `Scope Electricidad`: usa registros semilla (`SEED_RECORDS`).
- `Dashboard`: muestra actividad base local. Sus KPIs y graficas principales dependen de registros locales; si no hay registros guardados, puede verse parcial.
- `Configuracion`: muestra valores por defecto aunque no existan datos previos.
- `Perfil`: puede mostrar sesion local y configuracion basica.

Pantallas que solo muestran datos si ya existen datos guardados en `localStorage`:

- `Dashboard` completo
- `Scope Combustible`
- `Areas`
- `Reportes`
- `Metas`
- `Factores`
- `Equipos`
- `Usuarios`
- `Notificaciones`
- `Solicitudes de cambio de perfil`

Importante:

- En modo local no todos los modulos traen semillas precargadas.
- Si limpias el `localStorage`, varias pantallas volveran a quedar vacias hasta que captures o guardes informacion nuevamente.

## Disponibilidad de datos en modo backend

Cuando `VITE_LOCAL_MODE=false` y `VITE_API_URL` esta definido:

- `Dashboard` necesita `GET /records` y `GET /dashboard/activity`.
- `Emisiones`, `Scope Electricidad`, `Scope Combustible`, `Areas` y `Reportes` dependen de `GET /records`.
- `Metas` depende de `GET /targets`, `GET /actions` y `GET /records`.
- `Factores` depende de `GET /factors` y endpoints relacionados.
- `Equipos` depende de `GET /equipment` y normalmente `GET /factors/default`.
- `Usuarios` depende de `GET /users` y `GET /users/roles`.
- `Configuracion` depende de `GET /settings`.

Si esos endpoints no existen o no entregan datos, la vista correspondiente no tomara respaldo automatico desde `localStorage`.

## Scripts disponibles

```bash
npm run dev
npm run build
npm run preview
```

- `npm run dev`: inicia el servidor de desarrollo
- `npm run build`: genera la version de produccion en `frontend/dist/`
- `npm run preview`: sirve localmente la build generada

## Como probar el acceso

Con `VITE_LOCAL_MODE=true`, la pantalla de login incluye cuentas de demostracion. Puedes usar cualquiera de estas:

- `admin@itsmante.edu.mx` / `admin123`
- `ana@itsmante.edu.mx` / `captura1`
- `director@itsmante.edu.mx` / `consulta`

Con `VITE_LOCAL_MODE=false`, el acceso depende de `POST /auth/login` del backend.

## Estructura general

- `frontend/src/App.jsx`: enrutamiento principal
- `frontend/src/pages/Landing/`: landing publica
- `frontend/src/pages/LoginPage.jsx`: acceso al sistema
- `frontend/src/pages/DashboardPage.jsx`: dashboard principal
- `frontend/src/components/`: componentes reutilizables
- `frontend/src/lib/`: almacenamiento local, sesion y utilidades
- `frontend/src/api/`: capa unica de integracion remota
- `backend/database/`: esquema, semillas y migraciones iniciales de PostgreSQL
- `backend/src/`: espacio reservado para el backend real
- `docker-compose.yml`: stack local compartido para frontend y base de datos
- `frontend/Dockerfile`: imagen de desarrollo del frontend
- `frontend/public/`: assets estaticos

## Rutas principales

- `/`: landing publica o dashboard si ya existe sesion local
- `/login`: inicio de sesion
- `/perfil`: acceso al dashboard con sesion activa
- `/*`: rutas protegidas renderizadas desde el dashboard

## Build de produccion

```bash
cd frontend
npm run build
npm run preview
```

## Consideraciones del proyecto

- Este repositorio sigue siendo util como frontend local y demo, pero tambien puede operar en integracion real con backend.
- Parte del comportamiento local esta orientado a demostracion y prototipo.
- El comportamiento exacto de integracion backend esta documentado en `backend/BACKEND_READINESS.md`.
- Si necesitas limpiar el estado local para volver a empezar, borra el `localStorage` del navegador.

## Solucion de problemas

Si el proyecto no arranca:

1. Verifica la version de Node.js con `node -v`.
2. Verifica la version de npm con `npm -v`.
3. Reinstala dependencias con `npm install`.
4. Si persiste el problema, elimina `node_modules` y vuelve a ejecutar `npm install`.

Si trabajas con Docker y el frontend no refleja cambios:

1. Verifica que el contenedor `frontend` siga corriendo.
2. Reinicia con `docker compose up --build`.
3. Si el problema viene de la BD inicial, recuerda que los scripts solo corren al crear el volumen por primera vez.
