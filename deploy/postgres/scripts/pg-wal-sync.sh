#!/usr/bin/env bash
# Hourly WAL archive sync to offsite storage.
# WAL files are archived continuously by PostgreSQL archive_command;
# this job copies the archive directory to remote storage.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib.sh"

ensure_dirs

if [[ ! -d "$WAL_DIR" ]]; then
  fail "WAL archive directory missing: $WAL_DIR"
fi

WAL_COUNT="$(find "$WAL_DIR" -maxdepth 1 -type f ! -name '*.partial' 2>/dev/null | wc -l | tr -d ' ')"
log "WAL sync starting (${WAL_COUNT} archived files)"

if [[ -z "${RSYNC_TARGET:-}" && -z "${S3_BUCKET:-}" ]]; then
  log "No offsite target configured; WAL remains local only"
  exit 0
fi

maybe_rsync_offsite "$WAL_DIR"
maybe_s3_sync "$WAL_DIR"

log "WAL sync completed"
