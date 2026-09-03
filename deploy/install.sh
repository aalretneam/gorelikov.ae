#!/usr/bin/env bash
# Статика gorelikov.ae на текущем VPS (рядом с Palma, отдельный nginx).
# Запуск на VPS от root:
#   sudo bash /opt/gorelikov.ae/deploy/install.sh
set -euo pipefail

DOMAIN="${DOMAIN:-gorelikov.ae}"
WWW_DOMAIN="${WWW_DOMAIN:-www.${DOMAIN}}"
WEB_ROOT="${WEB_ROOT:-/var/www/gorelikov.ae}"
SITE_NAME="${NGINX_SITE:-gorelikov.ae}"
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONF_SRC="$SRC_DIR/deploy/nginx-gorelikov.ae.conf"
DEST="/etc/nginx/sites-available/$SITE_NAME"
ENABLED="/etc/nginx/sites-enabled/$SITE_NAME"
SITE_SRC="$SRC_DIR/site"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "ERROR: запустите от root: sudo bash $0"
  exit 1
fi

if [[ ! -f "$CONF_SRC" ]]; then
  echo "ERROR: нет $CONF_SRC"
  exit 1
fi

if [[ ! -f "$SITE_SRC/index.html" ]]; then
  echo "ERROR: нет $SITE_SRC/index.html"
  exit 1
fi

mkdir -p "$WEB_ROOT"
rsync -a --delete \
  --exclude '.DS_Store' \
  --exclude 'og.html' \
  "$SITE_SRC/" "$WEB_ROOT/"

find_ssl_pair() {
  local live="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
  local key="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
  if [[ -f "$live" && -f "$key" ]]; then
    echo "$live|$key"
    return 0
  fi
  return 1
}

if SSL_PAIR=$(find_ssl_pair); then
  SSL_CERT="${SSL_PAIR%%|*}"
  SSL_KEY="${SSL_PAIR#*|}"
  echo "SSL: $SSL_CERT"
  sed "s|__SSL_CERT__|$SSL_CERT|g; s|__SSL_KEY__|$SSL_KEY|g" "$CONF_SRC" > "$DEST"
else
  echo "SSL ещё нет — временный HTTP-vhost для ACME. Потом: sudo bash deploy/setup-ssl.sh"
  cat > "$DEST" <<EOF
server {
    listen 80;
    server_name ${DOMAIN} ${WWW_DOMAIN};
    root ${WEB_ROOT};
    index index.html;
    error_page 404 /404.html;
    location /.well-known/acme-challenge/ { allow all; }
    location / { try_files \$uri \$uri/ =404; }
}
EOF
fi

ln -sf "$DEST" "$ENABLED"
nginx -t
systemctl reload nginx
echo "OK: ${DOMAIN} → ${WEB_ROOT}"
echo "Проверка: curl -sI -H 'Host: ${DOMAIN}' http://127.0.0.1/"
