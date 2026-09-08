#!/usr/bin/env bash
# Статика art.gorelikov.ae на Beget. Не пишет в /var/www/gorelikov.ae.
#   sudo bash /opt/art.gorelikov.ae/deploy/install.sh
set -euo pipefail

DOMAIN="art.gorelikov.ae"
WEB_ROOT="/var/www/art.gorelikov.ae"
SITE_NAME="art.gorelikov.ae"
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONF_SRC="$SRC_DIR/deploy/nginx-art.gorelikov.ae.conf"
DEST="/etc/nginx/sites-available/$SITE_NAME"
ENABLED="/etc/nginx/sites-enabled/$SITE_NAME"
SITE_SRC="$SRC_DIR/dist"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "ERROR: запустите от root: sudo bash $0"
  exit 1
fi

if [[ "$SRC_DIR" == "/opt/gorelikov.ae" || "$WEB_ROOT" == "/var/www/gorelikov.ae" || "$SITE_NAME" == "gorelikov.ae" ]]; then
  echo "ERROR: отказ — этот скрипт не должен трогать Расписалку"
  exit 1
fi

if [[ ! -f "$CONF_SRC" ]]; then
  echo "ERROR: нет $CONF_SRC"
  exit 1
fi

if [[ ! -f "$SITE_SRC/index.html" ]]; then
  echo "ERROR: нет $SITE_SRC/index.html — сначала npm run build"
  exit 1
fi

mkdir -p "$WEB_ROOT"
rsync -a --delete \
  --exclude '.DS_Store' \
  --exclude '.well-known' \
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
    server_name ${DOMAIN};
    root ${WEB_ROOT};
    index index.html;
    location /.well-known/acme-challenge/ { allow all; }
    location / { try_files \$uri \$uri/ =404; }
}
EOF
fi

ln -sf "$DEST" "$ENABLED"
nginx -t
systemctl reload nginx
echo "OK: ${DOMAIN} → ${WEB_ROOT}"
echo "gorelikov.ae не менялся"
