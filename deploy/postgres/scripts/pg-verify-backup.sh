#!/usr/bin/env bash
# Verify latest backups exist and checksums match.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib.sh"

ensure_dirs

BASE="${FULL_DIR}/latest-base.tar.gz"
LOGICAL="${LOGICAL_DIR}/latest.dump"

[[ -f "$BASE" ]] || fail "Missing latest physical backup symlink/target: $BASE"
[[ -f "$LOGICAL" ]] || fail "Missing latest logical backup symlink/target: $LOGICAL"

verify_checksum "$BASE"
verify_checksum "$LOGICAL"

BASE_AGE_HOURS=$(( ($(date +%s) - $(stat -c %Y "$BASE" 2>/dev/null || stat -f %m "$BASE")) / 3600 ))
if [[ "$BASE_AGE_HOURS" -gt 36 ]]; then
  fail "Latest physical backup is ${BASE_AGE_HOURS}h old (>36h threshold)"
fi

WAL_RECENT="$(find "$WAL_DIR" -maxdepth 1 -type f -mmin -120 2>/dev/null | head -n 1 || true)"
if [[ -z "$WAL_RECENT" && -d "$WAL_DIR" ]]; then
  log "WARN: no WAL files modified in the last 120 minutes (archive may be idle or misconfigured)"
fi

log "Backup verification OK"
log "  base: $(readlink -f "$BASE" 2>/dev/null || echo "$BASE")"
log "  logical: $(readlink -f "$LOGICAL" 2>/dev/null || echo "$LOGICAL")"
