#!/usr/bin/env bash
# На Beget: подтянуть origin/main и выложить сайт, если коммит изменился.
# systemd-таймер raspisalka-deploy.timer зовёт этот скрипт раз в минуту.
#   sudo bash /opt/gorelikov.ae/deploy/pull-main.sh
set -euo pipefail

SRC_DIR="${SRC_DIR:-/opt/gorelikov.ae}"
REPO_URL="${REPO_URL:-https://github.com/aalretneam/gorelikov.ae.git}"
BRANCH="${BRANCH:-main}"
INSTALL_SH="${INSTALL_SH:-$SRC_DIR/deploy/install.sh}"
LOCK="${LOCK:-/run/raspisalka-deploy.lock}"

if [[ "${SKIP_ROOT_CHECK:-}" != "1" && "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "ERROR: запустите от root: sudo bash $0"
  exit 1
fi

mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "deploy: уже выполняется, пропуск"
  exit 0
fi

export GIT_TERMINAL_PROMPT=0

git_repo() {
  git -c "safe.directory=$SRC_DIR" -C "$SRC_DIR" "$@"
}

clone_or_update() {
  if [[ ! -d "$SRC_DIR/.git" ]]; then
    echo "deploy: клонирую $REPO_URL → $SRC_DIR"
    mkdir -p "$(dirname "$SRC_DIR")"
    git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$SRC_DIR"
    return 0
  fi

  git_repo remote set-url origin "$REPO_URL"
  git_repo fetch --prune origin "+refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}"

  local local_sha remote_sha
  local_sha="$(git_repo rev-parse HEAD)"
  remote_sha="$(git_repo rev-parse "origin/$BRANCH")"
  if [[ "$local_sha" == "$remote_sha" ]]; then
    return 1
  fi

  echo "deploy: $local_sha → $remote_sha"
  git_repo checkout -B "$BRANCH" "origin/$BRANCH"
  git_repo reset --hard "origin/$BRANCH"
  return 0
}

if clone_or_update; then
  if [[ ! -x "$INSTALL_SH" && ! -f "$INSTALL_SH" ]]; then
    echo "ERROR: нет $INSTALL_SH"
    exit 1
  fi
  bash "$INSTALL_SH"
  echo "deploy: готово $(git_repo rev-parse --short HEAD)"
fi
