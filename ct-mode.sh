#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# ct-mode.sh — alterna el modo de acceso de CarbonTrack sin rebuild
#
# USO (correr dentro del VPS, en la carpeta del proyecto):
#   ./ct-mode.sh public        Abre el sitio al público
#   ./ct-mode.sh private       Solo IPs en la whitelist (default)
#   ./ct-mode.sh status        Muestra el modo actual
#
# Tarda ~3 segundos. Solo reinicia el contenedor nginx, sin tocar la app.
# ─────────────────────────────────────────────────────────────────────────────

set -e

ENV_FILE=".env.prod"
COMPOSE="docker compose -f docker-compose.prod.yml"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: no se encontró $ENV_FILE en $(pwd)"
    echo "Corré este script desde la raíz del proyecto en el VPS."
    exit 1
fi

print_help() {
    echo "USO: $0 {public|private|status}"
    echo ""
    echo "  public   → abre el sitio a cualquier IP"
    echo "  private  → solo IPs en la whitelist de nginx/nginx.conf.template"
    echo "  status   → muestra el modo actual"
}

set_mode() {
    local new_mode="$1"

    # Reemplazar (o agregar) la línea ACCESS_MODE en .env.prod
    if grep -q '^ACCESS_MODE=' "$ENV_FILE"; then
        # Usamos | como delimitador para evitar conflictos con / en futuros valores
        sed -i.bak "s|^ACCESS_MODE=.*|ACCESS_MODE=$new_mode|" "$ENV_FILE"
    else
        echo "ACCESS_MODE=$new_mode" >> "$ENV_FILE"
    fi
    rm -f "${ENV_FILE}.bak"

    echo "==> ACCESS_MODE actualizado a: $new_mode"
    echo "==> Reiniciando nginx (sin rebuild)..."
    $COMPOSE up -d --no-deps --force-recreate nginx

    echo ""
    echo "==> Listo. Modo actual: $new_mode"
    if [ "$new_mode" = "public" ]; then
        echo "    El sitio ahora es accesible para cualquier IP."
    else
        echo "    Solo las IPs en la whitelist pueden entrar (resto: 403)."
    fi
}

show_status() {
    local current
    current=$(grep '^ACCESS_MODE=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || true)
    echo "Modo en $ENV_FILE : ${current:-(no definido, default: private)}"
    echo -n "Modo en contenedor : "
    if $COMPOSE exec -T nginx sh -c 'echo "$ACCESS_MODE"' 2>/dev/null; then
        :
    else
        echo "(nginx no está corriendo)"
    fi
}

case "$1" in
    public|private) set_mode "$1" ;;
    status)         show_status ;;
    -h|--help|"")   print_help ;;
    *)              print_help ; exit 1 ;;
esac
