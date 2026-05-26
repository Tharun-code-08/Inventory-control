#!/usr/bin/env bash
# Daily physical + logical full backup.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib.sh"

require_cmd pg_basebackup
require_cmd pg_dump
ensure_dirs

STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
BASE_DIR="${FULL_DIR}/base-${STAMP}"
LOGICAL_FILE="${LOGICAL_DIR}/logical-${STAMP}.dump"

log "Starting full backup stamp=${STAMP}"

mkdir -p "$BASE_DIR"
pg_basebackup \
  -D "$BASE_DIR" \
  -Ft \
  -z \
  -P \
  -X fetch \
  -l "retail-ims-base-${STAMP}" \
  || fail "pg_basebackup failed"

tar -czf "${BASE_DIR}.tar.gz" -C "$FULL_DIR" "$(basename "$BASE_DIR")"
rm -rf "$BASE_DIR"
checksum_file "${BASE_DIR}.tar.gz"
log "Physical base backup: ${BASE_DIR}.tar.gz"

pg_dump \
  -F c \
  -f "$LOGICAL_FILE" \
  "$PGDATABASE" \
  || fail "pg_dump failed"

checksum_file "$LOGICAL_FILE"
log "Logical dump: ${LOGICAL_FILE}"

verify_checksum "${BASE_DIR}.tar.gz"
verify_checksum "$LOGICAL_FILE"

ln -sfn "${BASE_DIR}.tar.gz" "${FULL_DIR}/latest-base.tar.gz"
ln -sfn "$LOGICAL_FILE" "${LOGICAL_DIR}/latest.dump"

maybe_rsync_offsite "$FULL_DIR"
maybe_rsync_offsite "$LOGICAL_DIR"
maybe_s3_sync "$FULL_DIR"
maybe_s3_sync "$LOGICAL_DIR"

log "Full backup completed successfully"
