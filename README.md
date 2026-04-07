# CarbonTrCK

Aplicacion web para monitoreo y trazabilidad de huella de carbono orientada a instituciones educativas. El proyecto esta construido con React y Vite, e incluye una landing publica, flujo de inicio de sesion, dashboard y modulos de captura y consulta.

## Modos de operacion

El frontend puede trabajar en dos modos:

- `VITE_LOCAL_MODE=true`: modo local aislado para desarrollo y demo tecnica.
- `VITE_LOCAL_MODE=false` con `VITE_API_URL` definido: modo backend estricto.

Comportamiento real:

- En modo local, la aplicacion usa `localStorage` para sesion, registros y varios modulos.
- En modo backend, `src/api` deja de caer a `localStorage`. Si falta un endpoint o no responde, la vista afectada queda vacia o muestra error.
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

Desde la raiz del proyecto:

```bash
npm install
```

## Como arrancar en desarrollo

```bash
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
- `npm run build`: genera la version de produccion en `dist/`
- `npm run preview`: sirve localmente la build generada

## Como probar el acceso

Con `VITE_LOCAL_MODE=true`, la pantalla de login incluye cuentas de demostracion. Puedes usar cualquiera de estas:

- `admin@itsmante.edu.mx` / `admin123`
- `ana@itsmante.edu.mx` / `captura1`
- `director@itsmante.edu.mx` / `consulta`

Con `VITE_LOCAL_MODE=false`, el acceso depende de `POST /auth/login` del backend.

## Estructura general

- `src/App.jsx`: enrutamiento principal
- `src/pages/Landing/`: landing publica
- `src/pages/LoginPage.jsx`: acceso al sistema
- `src/pages/DashboardPage.jsx`: dashboard principal
- `src/components/`: componentes reutilizables
- `src/lib/`: almacenamiento local, sesion y utilidades
- `src/api/`: capa unica de integracion remota
- `public/`: assets estaticos

## Rutas principales

- `/`: landing publica o dashboard si ya existe sesion local
- `/login`: inicio de sesion
- `/perfil`: acceso al dashboard con sesion activa
- `/*`: rutas protegidas renderizadas desde el dashboard

## Build de produccion

```bash
npm run build
npm run preview
```

## Consideraciones del proyecto

- Este repositorio sigue siendo util como frontend local y demo, pero tambien puede operar en integracion real con backend.
- Parte del comportamiento local esta orientado a demostracion y prototipo.
- El comportamiento exacto de integracion backend esta documentado en `BACKEND_READINESS.md`.
- Si necesitas limpiar el estado local para volver a empezar, borra el `localStorage` del navegador.

## Solucion de problemas

Si el proyecto no arranca:

1. Verifica la version de Node.js con `node -v`.
2. Verifica la version de npm con `npm -v`.
3. Reinstala dependencias con `npm install`.
4. Si persiste el problema, elimina `node_modules` y vuelve a ejecutar `npm install`.
