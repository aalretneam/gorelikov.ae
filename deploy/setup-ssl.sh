#!/usr/bin/env bash
# Let's Encrypt для gorelikov.ae (отдельный сертификат, не 10000pasos.es).
# Перед запуском: A-записи DOMAIN и www → IP этого VPS, порты 80/443 открыты.
#   sudo CERTBOT_EMAIL=artem@gorelikov.ae bash deploy/setup-ssl.sh
set -euo pipefail

DOMAIN="${DOMAIN:-gorelikov.ae}"
WWW_DOMAIN="${WWW_DOMAIN:-www.${DOMAIN}}"
CERT_NAME="${CERT_NAME:-$DOMAIN}"
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-artem@gorelikov.ae}"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "ERROR: запустите от root: sudo bash $0"
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
for d in "$DOMAIN" "$WWW_DOMAIN"; do
  resolved=$(dig +short "$d" A | head -1 || true)
  echo "$d -> ${resolved:-?} ${SERVER_IP:+(сервер: $SERVER_IP)}"
  if [[ -n "$SERVER_IP" && -n "$resolved" && "$resolved" != "$SERVER_IP" ]]; then
    echo "ERROR: $d указывает не на этот VPS. Поправьте DNS и подождите пропагацию."
    exit 1
  fi
  if [[ -z "$resolved" ]]; then
    echo "ERROR: нет A-записи для $d"
    exit 1
  fi
done

bash "$SRC_DIR/deploy/install.sh"

certbot certonly --nginx --non-interactive --agree-tos \
  "${EMAIL_ARGS[@]}" \
  --cert-name "$CERT_NAME" \
  --expand \
  -d "$DOMAIN" -d "$WWW_DOMAIN"

bash "$SRC_DIR/deploy/install.sh"
echo "OK: https://${DOMAIN}/"
