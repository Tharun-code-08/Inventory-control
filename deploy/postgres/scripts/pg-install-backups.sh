#!/usr/bin/env bash
# Install PostgreSQL backup tooling on Ubuntu/Debian VPS.
#
# Run as root on the VPS:
#   sudo bash deploy/postgres/scripts/pg-install-backups.sh
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root (sudo)" >&2
  exit 1
fi

DEPLOY_POSTGRES="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_ROOT="/opt/retail-ims/postgres-backup"
ENV_DEST="/etc/retail-ims/postgres-backup.env"
BACKUP_ROOT="/var/backups/postgres"

echo "[install] Copying backup scripts to ${INSTALL_ROOT}"
mkdir -p "$INSTALL_ROOT/scripts"
cp "${DEPLOY_POSTGRES}/scripts/"* "$INSTALL_ROOT/scripts/"
chmod +x "$INSTALL_ROOT/scripts/"*.sh

if [[ ! -f "$ENV_DEST" ]]; then
  mkdir -p /etc/retail-ims
  cp "${DEPLOY_POSTGRES}/env.example" "$ENV_DEST"
  chmod 600 "$ENV_DEST"
  echo "[install] Created ${ENV_DEST} — edit PGDATABASE and credentials before first run"
else
  echo "[install] Keeping existing ${ENV_DEST}"
fi

mkdir -p "$BACKUP_ROOT"/{full,logical,wal,logs}
chown -R postgres:postgres "$BACKUP_ROOT"
chmod 750 "$BACKUP_ROOT"

echo "[install] Installing systemd units"
cp "${DEPLOY_POSTGRES}/systemd/"* /etc/systemd/system/
systemctl daemon-reload
systemctl enable pg-full-backup.timer pg-wal-sync.timer pg-backup-prune.timer pg-backup-verify.timer

echo
echo "[install] Next steps:"
echo "  1. Edit ${ENV_DEST} (PGDATABASE, optional RSYNC_TARGET/S3_BUCKET)"
echo "  2. Apply PostgreSQL archive settings from deploy/postgres/postgresql.conf.snippet"
echo "  3. Restart PostgreSQL: systemctl restart postgresql"
echo "  4. Run first backup:  ENV_FILE=${ENV_DEST} ${INSTALL_ROOT}/scripts/pg-full-backup.sh"
echo "  5. Verify:           ENV_FILE=${ENV_DEST} ${INSTALL_ROOT}/scripts/pg-verify-backup.sh"
echo "  6. Enable timers:    systemctl start pg-full-backup.timer pg-wal-sync.timer"
echo
echo "See docs/postgres-backup-recovery.md for restore runbook."
