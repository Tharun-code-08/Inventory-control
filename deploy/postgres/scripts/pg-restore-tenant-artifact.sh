#!/usr/bin/env bash
# Restore tenant backup artifact into local API storage before logical DB restore.
# Usage:
#   sudo ./pg-restore-tenant-artifact.sh /path/to/tenant-backup.json.gz
set -euo pipefail

ARTIFACT="${1:-}"
TARGET_DIR="${BACKUP_STORAGE_DIR:-/opt/retail-ims/storage/backups}"

if [[ -z "$ARTIFACT" || ! -f "$ARTIFACT" ]]; then
  echo "Usage: $0 /path/to/tenant-backup.json.gz" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"
DEST="$TARGET_DIR/restored-$(date +%Y%m%dT%H%M%SZ)-$(basename "$ARTIFACT")"
cp "$ARTIFACT" "$DEST"
sha256sum "$DEST" > "${DEST}.sha256"

echo "Tenant artifact staged at: $DEST"
echo "Next steps:"
echo "  1) Stop API: pm2 stop retail-api"
echo "  2) Restore DB shell: pg_restore or use in-app Settings -> Backups -> Restore"
echo "  3) For full DB crash, also run pg-restore-full.sh with latest logical dump"
echo "  4) Start API: pm2 restart retail-api"
