#!/usr/bin/env bash
# Let's Encrypt только для art.gorelikov.ae (отдельный cert-name).
# Не трогает сертификат gorelikov.ae.
#   sudo CERTBOT_EMAIL=artem@gorelikov.ae bash /opt/art.gorelikov.ae/deploy/setup-ssl.sh
set -euo pipefail

DOMAIN="art.gorelikov.ae"
CERT_NAME="art.gorelikov.ae"
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-artem@gorelikov.ae}"
WEB_ROOT="/var/www/art.gorelikov.ae"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "ERROR: запустите от root: sudo bash $0"
  exit 1
fi

if [[ "$SRC_DIR" == "/opt/gorelikov.ae" ]]; then
  echo "ERROR: отказ — SSL арта не из дерева Расписалки"
  exit 1
fi

if ! command -v certbot >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y certbot python3-certbot-nginx
fi

EMAIL_ARGS=(--register-unsafely-without-email)
if [[ -n "$CERTBOT_EMAIL" ]]; then
  EMAIL_ARGS=(--email "$CERTBOT_EMAIL" --no-eff-email)
fi

echo "=== DNS ==="
SERVER_IP=$(curl -4 -s --max-time 5 ifconfig.me || curl -4 -s --max-time 5 icanhazip.com || true)
resolved=$(dig +short "$DOMAIN" A | head -1 || true)
echo "$DOMAIN -> ${resolved:-?} ${SERVER_IP:+(сервер: $SERVER_IP)}"
if [[ -n "$SERVER_IP" && -n "$resolved" && "$resolved" != "$SERVER_IP" ]]; then
  echo "ERROR: $DOMAIN указывает не на этот VPS."
  exit 1
fi
if [[ -z "$resolved" ]]; then
  echo "ERROR: нет A-записи для $DOMAIN"
  exit 1
fi

bash "$SRC_DIR/deploy/install.sh"

mkdir -p "$WEB_ROOT/.well-known/acme-challenge"
certbot certonly --webroot -w "$WEB_ROOT" \
  --non-interactive --agree-tos \
  "${EMAIL_ARGS[@]}" \
  --cert-name "$CERT_NAME" \
  -d "$DOMAIN"

bash "$SRC_DIR/deploy/install.sh"
echo "OK: https://${DOMAIN}/"
echo "Сертификат gorelikov.ae не менялся"
