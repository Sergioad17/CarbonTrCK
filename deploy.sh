#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Script de deploy para CarbonTrack en VPS (Hostinger)
# Dominio: carbontrack.lat
#
# USO:
#   chmod +x deploy.sh
#   ./deploy.sh          # primer deploy (instala Docker, obtiene cert SSL)
#   ./deploy.sh update   # actualizar la app (rebuild + restart)
# ─────────────────────────────────────────────────────────────────────────────

set -e

DOMAIN="carbontrack.lat"
EMAIL="tu@email.com"          # <-- Cambiar por tu email real
COMPOSE="docker compose -f docker-compose.prod.yml"

# ─────────────────────────────────────────────────────────────────
# MODO UPDATE: solo reconstruye y reinicia
# ─────────────────────────────────────────────────────────────────
if [ "$1" = "update" ]; then
    echo "==> Actualizando la aplicación..."
    $COMPOSE build --no-cache
    $COMPOSE up -d --force-recreate
    echo "==> Actualización completada."
    exit 0
fi

# ─────────────────────────────────────────────────────────────────
# PASO 1: Instalar Docker si no está instalado
# ─────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    echo "==> Instalando Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "==> Docker instalado."
else
    echo "==> Docker ya está instalado ($(docker --version))."
fi

# ─────────────────────────────────────────────────────────────────
# PASO 2: Verificar que .env.prod existe
# ─────────────────────────────────────────────────────────────────
if [ ! -f ".env.prod" ]; then
    echo ""
    echo "ERROR: Falta el archivo .env.prod"
    echo "Copiá .env.prod.example, completá los valores y volvé a correr este script."
    echo "  cp .env.prod.example .env.prod && nano .env.prod"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────
# PASO 3: Obtener certificado SSL con Certbot
#         Usamos nginx-certbot-init.conf (solo HTTP, sin whitelist)
#         para que Let's Encrypt pueda hacer el challenge.
# ─────────────────────────────────────────────────────────────────
echo ""
echo "==> PASO 3: Obteniendo certificado SSL para $DOMAIN..."

# Crear volúmenes necesarios antes de arrancar
docker volume create carbontrack-p2-letsencrypt 2>/dev/null || true
docker volume create carbontrack-p2-certbot_www 2>/dev/null || true

# Levantar nginx con config temporal (solo HTTP, para el challenge)
echo "  -> Levantando nginx en modo init (HTTP)..."
docker run -d --rm \
    --name nginx-certbot-init \
    -p 80:80 \
    -v carbontrack-p2-certbot_www:/var/www/certbot \
    -v "$(pwd)/nginx/nginx-certbot-init.conf:/etc/nginx/nginx.conf:ro" \
    nginx:1.27-alpine

sleep 3

# Correr certbot
echo "  -> Solicitando certificado a Let's Encrypt..."
docker run --rm \
    -v carbontrack-p2-letsencrypt:/etc/letsencrypt \
    -v carbontrack-p2-certbot_www:/var/www/certbot \
    certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        -d "www.$DOMAIN"

# Detener nginx temporal
docker stop nginx-certbot-init 2>/dev/null || true

echo "  -> Certificado obtenido."

# ─────────────────────────────────────────────────────────────────
# PASO 4: Levantar la app completa
# ─────────────────────────────────────────────────────────────────
echo ""
echo "==> PASO 4: Construyendo y levantando la aplicación..."
$COMPOSE build --no-cache
$COMPOSE up -d

echo ""
echo "==> Deploy completado."
echo "    Sitio disponible en: https://$DOMAIN"
echo ""
echo "Comandos útiles:"
echo "  Ver logs:          docker compose -f docker-compose.prod.yml logs -f"
echo "  Ver logs nginx:    docker compose -f docker-compose.prod.yml logs -f nginx"
echo "  Reiniciar:         docker compose -f docker-compose.prod.yml restart"
echo "  Parar todo:        docker compose -f docker-compose.prod.yml down"
echo "  Actualizar app:    ./deploy.sh update"

# ─────────────────────────────────────────────────────────────────
# RECORDATORIO: renovación del certificado
# ─────────────────────────────────────────────────────────────────
echo ""
echo "RENOVACIÓN SSL (cada 90 días):"
echo "  Agregar al crontab del VPS (crontab -e):"
echo "  0 3 * * 1 docker run --rm -v carbontrack-p2-letsencrypt:/etc/letsencrypt -v carbontrack-p2-certbot_www:/var/www/certbot certbot/certbot renew --quiet && docker compose -f $(pwd)/docker-compose.prod.yml exec nginx nginx -s reload"
