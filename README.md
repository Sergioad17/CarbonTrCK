# CarbonTrCK

Web platform for monitoring, traceability, and carbon footprint management for educational institutions.

## Current state

- `frontend`: React + Vite, intended to run locally and consume the real backend.
- `backend`: Express + PostgreSQL with JWT auth and the main operational modules.
- `docker-compose.yml`: prepared to run `backend` and `postgres` in a stable way, with optional `pgadmin`.

## Target flow

For this stage of the project, the recommended setup is:

- local `frontend`
- real `backend` in Docker
- `postgres` in Docker
- no demo, mock, or local fallback as source of truth

## Main variables

Frontend:

```env
VITE_API_BASE_URL=http://localhost:3002
```

Backend:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://carbontrack_app:change_this_password@postgres:5432/carbontrack
JWT_ACCESS_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_another_long_random_secret
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
APP_BASE_URL=http://localhost:3002
BCRYPT_ROUNDS=10
FORGOT_PASSWORD_TOKEN_TTL=30m
```

Database:

```env
POSTGRES_DB=carbontrack
POSTGRES_USER=carbontrack_app
POSTGRES_PASSWORD=change_this_password
```

## Run backend in Docker

First time, or after backend code changes:

```bash
docker compose up -d --build postgres backend
```

Health check:

```bash
curl http://localhost:3002/health
```

Notes:

- The backend no longer uses a source bind mount in Docker, to avoid accidentally serving stale code.
- If you change backend code, rebuild with `docker compose up -d --build backend`.
- `APP_BASE_URL` must point to the published backend URL so modules such as `files` generate correct URLs.

## Run frontend locally

```bash
cd frontend
npm install
npm run dev
```

The frontend should target the Docker backend published at `http://localhost:3002`.

## Tests

Frontend:

```bash
cd frontend
npm run build
```

Backend:

```bash
cd backend
npm test
```

Useful targeted suites:

```bash
node --test --test-concurrency=1 tests/auth-and-user-management.test.js
node --test --test-concurrency=1 tests/file-management.test.js
node --test --test-concurrency=1 tests/settings-notifications-profile-requests.test.js
```

## Relevant endpoints

Auth and profile:

- `POST /auth/login`
- `GET /auth/me`
- `GET /profile`
- `PATCH /profile/password`

Operations:

- `GET /users`
- `GET /records`
- `POST /records`
- `GET /areas`
- `GET /dashboard/activity`
- `GET /devices`
- `GET /factors`
- `GET /equipment`
- `GET /targets`
- `GET /actions`
- `GET /settings`
- `PUT /settings`
- `GET /notifications`
- `POST /notifications`
- `GET /profile-change-requests`
- `POST /profile-change-requests`

Files:

- `POST /files`
- `GET /files/:id`
- `POST /records/:id/files`

Notes about `files`:

- the backend does not expose a general `GET /files` listing
- the supported flow is upload, receive the `id`, and download with `GET /files/:id`
- files can also be attached from records through `POST /records/:id/files`

## Frontend modules that depend on the real backend

- login and session
- profile
- users
- records
- areas
- dashboard
- factors
- equipment
- devices
- targets
- actions
- settings
- notifications
- profile change requests

## Devices

Operational rules:

- credentials must be issued by the backend
- the frontend must not generate secrets
- sensitive credentials must not be stored in `localStorage`
- the device backend URL must come from real config, not demo placeholders

## Deployment

Before a VPS or production rollout:

- define the public backend domain or URL
- update `APP_BASE_URL`
- publish frontend and backend over HTTPS
- restrict CORS to the real frontend origin
- keep frontend and backend separated by clear environment variables
- run backend from rebuilt images, not from dynamically mounted source code
