# ─── Etapa 1: build del frontend ───────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .

# La URL base de la API se inyecta en tiempo de build (queda embebida en el JS)
ARG VITE_API_BASE_URL=https://carbontrack.lat/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ─── Etapa 2: nginx sirve el frontend + hace proxy al backend ───────────────
FROM nginx:1.27-alpine

# envsubst (incluido en gettext) para renderizar el template al arrancar
RUN apk add --no-cache gettext

# Archivos estáticos del frontend
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Template de nginx (se renderiza al arrancar inyectando ACCESS_MODE)
COPY nginx/nginx.conf.template /etc/nginx/nginx.conf.template

# Entrypoint que valida ACCESS_MODE, corre envsubst y arranca nginx
COPY nginx/docker-entrypoint.sh /docker-entrypoint-carbontrack.sh
RUN chmod +x /docker-entrypoint-carbontrack.sh

# Carpeta para los challenges de Let's Encrypt (webroot)
RUN mkdir -p /var/www/certbot

EXPOSE 80 443

ENTRYPOINT ["/docker-entrypoint-carbontrack.sh"]
