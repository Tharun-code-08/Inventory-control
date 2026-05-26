#!/usr/bin/env bash
# Install Docker-based backup scripts and systemd units.
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root (sudo)" >&2
  exit 1
fi

DEPLOY_POSTGRES="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_ROOT="/opt/retail-ims/postgres-backup"
ENV_DEST="/etc/retail-ims/postgres-backup.env"
SYSTEMD_DIR="/etc/systemd/system"

echo "[install] Copying backup scripts to ${INSTALL_ROOT}"
mkdir -p "${INSTALL_ROOT}/scripts"
cp "${DEPLOY_POSTGRES}/scripts/pg-docker-"*.sh "${INSTALL_ROOT}/scripts/"
cp "${DEPLOY_POSTGRES}/scripts/lib-docker.sh" "${INSTALL_ROOT}/scripts/"
chmod +x "${INSTALL_ROOT}/scripts/"*.sh

if [[ ! -f "$ENV_DEST" ]]; then
  mkdir -p /etc/retail-ims
  cp "${DEPLOY_POSTGRES}/env.docker.example" "$ENV_DEST"
  chmod 600 "$ENV_DEST"
  echo "[install] Created ${ENV_DEST} — edit DOCKER_CONTAINER and credentials before enabling timers"
else
  echo "[install] Keeping existing ${ENV_DEST}"
fi

echo "[install] Creating backup directories"
mkdir -p /var/backups/postgres/full /var/backups/postgres/companies /var/backups/postgres/logs
chmod 750 /var/backups/postgres /var/backups/postgres/full /var/backups/postgres/companies /var/backups/postgres/logs 2>/dev/null || true

echo "[install] Installing systemd units"
cp "${DEPLOY_POSTGRES}/systemd/pg-docker-"*.service "${SYSTEMD_DIR}/"
cp "${DEPLOY_POSTGRES}/systemd/pg-docker-"*.timer "${SYSTEMD_DIR}/"
systemctl daemon-reload
systemctl enable pg-docker-full-backup.timer pg-docker-company-backup.timer pg-docker-prune.timer pg-docker-verify.timer

echo
echo "[install] Next steps:"
echo "  1) Edit ${ENV_DEST} (DOCKER_CONTAINER, PGUSER/PGPASSWORD if needed)"
echo "  2) Start timers: systemctl start pg-docker-full-backup.timer pg-docker-company-backup.timer"
echo "                   systemctl start pg-docker-prune.timer pg-docker-verify.timer"
echo "  3) Check status: systemctl list-timers 'pg-docker-*'"
