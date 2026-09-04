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

mkdir -p "$WEB_ROOT" /var/lib/raspisalka/s
chown -R www-data:www-data /var/lib/raspisalka
chmod 750 /var/lib/raspisalka
if [[ ! -f /var/lib/raspisalka/telegram.env ]]; then
  cat > /var/lib/raspisalka/telegram.env <<'EOF'
# Форма «написать разработчику» → Telegram-бот (токен не в git).
# 1) @BotFather → /newbot → токен
# 2) Напиши боту /start
# 3) chat_id: curl -s "https://api.telegram.org/bot<TOKEN>/getUpdates"
# 4) Раскомментируй строки и: systemctl restart raspisalka-share
# TELEGRAM_BOT_TOKEN=123456:ABC...
# TELEGRAM_CHAT_ID=123456789
EOF
  chown www-data:www-data /var/lib/raspisalka/telegram.env
  chmod 640 /var/lib/raspisalka/telegram.env
fi
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
    location /s/ { try_files /index.html =404; }
    location /api/ {
        proxy_pass http://127.0.0.1:18765;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        client_max_body_size 80k;
    }
    location / { try_files \$uri \$uri/ =404; }
}
EOF
fi

ln -sf "$DEST" "$ENABLED"

install -m 644 "$SRC_DIR/deploy/raspisalka-share.service" /etc/systemd/system/raspisalka-share.service
systemctl daemon-reload
systemctl enable --now raspisalka-share
systemctl restart raspisalka-share

nginx -t
systemctl reload nginx
echo "OK: ${DOMAIN} → ${WEB_ROOT}"
echo "Проверка: curl -sI -H 'Host: ${DOMAIN}' http://127.0.0.1/"
if ! grep -qE '^TELEGRAM_BOT_TOKEN=' /var/lib/raspisalka/telegram.env 2>/dev/null; then
  echo "Форма «написать»: заполни /var/lib/raspisalka/telegram.env и sudo systemctl restart raspisalka-share"
fi
