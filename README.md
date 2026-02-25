

## Requisitos

- Node.js 18 o superior (recomendado Node 20 LTS)
- npm 9 o superior

## Instalación

```bash
npm install
```

## Arranque en desarrollo

```bash
npm run dev
```

- La app levanta en `http://localhost:3000`
- El navegador se abre automáticamente (`open: true` en Vite)

## Scripts disponibles

- `npm run dev`: inicia servidor de desarrollo
- `npm run build`: genera build de producción en `dist/`
- `npm run preview`: sirve localmente el build de producción

## Estructura básica

- `src/App.jsx`: enrutamiento principal
- `src/pages/Landing/`: landing pública
- `src/pages/LoginPage.jsx`: login
- `src/pages/DashboardPage.jsx`: dashboard principal
- `public/`: assets estáticos (incluye modelos 3D para landing)

## Rutas principales

- `/`: landing pública (o dashboard si hay sesión)
- `/login`: acceso de usuarios
- `/*`: rutas protegidas del dashboard

## Build de producción

```bash
npm run build
npm run preview
```

## Notas

- Este proyecto no requiere variables de entorno para arrancar localmente.
- Si hay problemas de instalación, elimina `node_modules` y `package-lock.json`, luego ejecuta `npm install` nuevamente.
