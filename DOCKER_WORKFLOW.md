# Docker Workflow

## Objetivo

Estandarizar el entorno local del equipo de backend y frontend usando el mismo stack base:

- `frontend` con Vite
- `postgres` con esquema inicial de CarbonTrCK
- `pgadmin` opcional para inspeccion local
- `backend/src` reservado para la API real

## Primer setup por integrante

1. Crear su archivo local:

```bash
copy .env.example .env
```

Si va a correr el frontend sin Docker, tambien necesita:

```bash
copy frontend\\.env.example frontend\\.env
```

2. Levantar el stack:

```bash
docker compose up --build
```

3. Si necesita explorar la base con interfaz grafica:

```bash
docker compose --profile tools up --build
```

## Flujo de ramas

Docker no cambia el flujo de Git.

Cada integrante debe:

1. Crear una rama nueva desde `main`.
2. Trabajar y probar sus cambios con Docker local.
3. Subir su rama.
4. Abrir Pull Request.
5. Pedir revision.
6. Hacer merge a `main` solo cuando el PR este aprobado.

## Reglas para no pisarse

- No subir secretos reales.
- No editar el `.env` de otra persona.
- Versionar solo `.env.example`.
- No versionar volumenes ni datos de la BD.
- Si cambian el modelo de datos, hacerlo mediante SQL versionado en `backend/database/migrations/`.
- Documentar cualquier nuevo servicio agregado al `docker-compose.yml`.

## Base de datos

- Host: `localhost`
- Puerto: `5432`
- Base: valor de `POSTGRES_DB`
- Usuario: valor de `POSTGRES_USER`
- Password: valor de `POSTGRES_PASSWORD`

La base se crea desde:

- `backend/database/database.sql`
- `backend/database/seed_catalogs.sql`

## Paso siguiente recomendado

Cuando el backend ya exista como codigo dentro de `backend/src`, agregar un servicio `backend` al `docker-compose.yml` para que el frontend deje de depender de un API externo.
