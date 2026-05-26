#!/usr/bin/env bash
# Restore from latest (or specified) logical pg_dump backup into a target database.
# Usage:
#   sudo ./pg-restore-full.sh [dump_file] [target_db_name]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib.sh"

require_cmd pg_restore
require_cmd psql
require_cmd createdb
require_cmd dropdb

DUMP_FILE="${1:-${LOGICAL_DIR}/latest.dump}"
TARGET_DB="${2:-${PGDATABASE}_restored}"

[[ -f "$DUMP_FILE" ]] || fail "Dump file not found: $DUMP_FILE"
verify_checksum "$DUMP_FILE"

log "Restoring logical dump"
log "  source: $DUMP_FILE"
log "  target database: $TARGET_DB"

if psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${TARGET_DB}'" | grep -q 1; then
  log "Dropping existing database ${TARGET_DB}"
  dropdb "$TARGET_DB"
fi

createdb "$TARGET_DB"
pg_restore \
  --no-owner \
  --no-privileges \
  --jobs="$(nproc 2>/dev/null || echo 2)" \
  -d "$TARGET_DB" \
  "$DUMP_FILE"

log "Logical restore completed into ${TARGET_DB}"
log "Update DATABASE_URL to point at ${TARGET_DB} after validation, then restart retail-api"
