# CarbonTrCK

Aplicación web para monitoreo y trazabilidad de huella de carbono orientada a instituciones educativas. El proyecto está construido con React y Vite, e incluye una landing pública, flujo de inicio de sesión, dashboard y módulos de captura/consulta.

## Qué se necesita para arrancar

- Node.js 18 o superior
- npm 9 o superior
- Un navegador moderno como Chrome, Edge o Firefox

Recomendado:

- Node.js 20 LTS

## Tecnologías principales

- React 18
- Vite 5
- React Router DOM
- Recharts
- Three.js
- React Three Fiber / Drei

## Instalación

Desde la raíz del proyecto:

```bash
npm install
```

## Cómo arrancar en desarrollo

```bash
npm run dev
```

La aplicación se levanta en:

```text
http://localhost:3000
```

Notas de arranque:

- Vite está configurado para abrir el navegador automáticamente.
- No se requieren variables de entorno para ejecutar el proyecto localmente.
- No se necesita backend para probar el flujo principal del MVP.
- La sesión y buena parte de los datos de prueba se almacenan en `localStorage`.

## Scripts disponibles

```bash
npm run dev
npm run build
npm run preview
```

- `npm run dev`: inicia el servidor de desarrollo
- `npm run build`: genera la versión de producción en `dist/`
- `npm run preview`: sirve localmente la build generada

## Cómo probar el acceso

La pantalla de login incluye cuentas de demostración. Puedes usar cualquiera de estas:

- `admin@itsmante.edu.mx` / `admin123`
- `ana@itsmante.edu.mx` / `captura1`
- `director@itsmante.edu.mx` / `consulta`

## Estructura general

- `src/App.jsx`: enrutamiento principal
- `src/pages/Landing/`: landing pública
- `src/pages/LoginPage.jsx`: acceso al sistema
- `src/pages/DashboardPage.jsx`: dashboard principal
- `src/components/`: componentes reutilizables
- `src/lib/`: almacenamiento local, sesión y utilidades
- `public/`: assets estáticos

## Rutas principales

- `/`: landing pública o dashboard si ya existe sesión local
- `/login`: inicio de sesión
- `/perfil`: acceso al dashboard con sesión activa
- `/*`: rutas protegidas renderizadas desde el dashboard

## Build de producción

```bash
npm run build
npm run preview
```

## Consideraciones del proyecto

- Este repositorio funciona actualmente como frontend/MVP local.
- Parte del comportamiento está orientado a demostración y prototipo.
- Si necesitas limpiar el estado local para volver a empezar, borra el `localStorage` del navegador.

## Solución de problemas

Si el proyecto no arranca:

1. Verifica la versión de Node.js con `node -v`
2. Verifica la versión de npm con `npm -v`
3. Reinstala dependencias con `npm install`
4. Si persiste el problema, elimina `node_modules` y vuelve a ejecutar `npm install`
