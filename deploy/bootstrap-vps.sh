#!/usr/bin/env bash
# Первый залив Расписалки на чистый Ubuntu VPS (Beget и т.п.).
# Запуск от root:
#   bash deploy/bootstrap-vps.sh
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
REPO_URL="${REPO_URL:-https://github.com/aalretneam/gorelikov.ae.git}"
SRC_DIR="${SRC_DIR:-/opt/gorelikov.ae}"

apt-get update -qq
apt-get install -y nginx git rsync python3 certbot python3-certbot-nginx curl dnsutils
systemctl enable --now nginx
rm -f /etc/nginx/sites-enabled/default

if [[ -d "$SRC_DIR/.git" ]]; then
  git -C "$SRC_DIR" fetch origin
  git -C "$SRC_DIR" checkout main
  git -C "$SRC_DIR" pull origin main
else
  git clone --branch main "$REPO_URL" "$SRC_DIR"
fi

CERTBOT_EMAIL="${CERTBOT_EMAIL:-artem@gorelikov.ae}" bash "$SRC_DIR/deploy/setup-ssl.sh"
echo "Проверка: curl -sI https://gorelikov.ae/ | head"
