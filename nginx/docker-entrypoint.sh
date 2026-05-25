#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Entrypoint del contenedor nginx
# Lee ACCESS_MODE del entorno, valida, lo inyecta en nginx.conf vía envsubst,
# y arranca nginx en foreground.
# ─────────────────────────────────────────────────────────────────────────────
set -e

# Default fail-safe: si la var no viene, asume modo privado (whitelist activa)
: "${ACCESS_MODE:=private}"

# Solo aceptar valores conocidos. Cualquier typo → privado.
case "$ACCESS_MODE" in
    public|private)
        ;;
    *)
        echo "[entrypoint] ACCESS_MODE='$ACCESS_MODE' no es válido. Forzando 'private' por seguridad."
        ACCESS_MODE=private
        ;;
esac
export ACCESS_MODE

echo "[entrypoint] ACCESS_MODE=$ACCESS_MODE"

# Renderizar el template (solo sustituye ${ACCESS_MODE}, deja intactas las
# demás variables nginx como $host, $remote_addr, etc.)
envsubst '${ACCESS_MODE}' \
    < /etc/nginx/nginx.conf.template \
    > /etc/nginx/nginx.conf

# Validar config antes de arrancar
nginx -t

exec nginx -g 'daemon off;'
