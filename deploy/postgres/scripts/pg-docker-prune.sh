#!/usr/bin/env bash
# Prune Docker backup files older than RETENTION_DAYS.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib-docker.sh"

require_cmd find
ensure_dirs

prune_dir() {
  local dir="$1"
  local label="$2"
  local days="$RETENTION_DAYS"
  local count
  count="$(find "$dir" -mindepth 1 -maxdepth 1 -type f -mtime +"$days" 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "$count" -gt 0 ]]; then
    find "$dir" -mindepth 1 -maxdepth 1 -type f -mtime +"$days" -print -delete
    log "Pruned ${count} ${label} file(s) older than ${days} days from ${dir}"
  else
    log "No ${label} files to prune in ${dir}"
  fi
}

prune_dir "$FULL_DIR" "full backup"
prune_dir "$COMPANY_DIR" "company backup"

log "Prune completed"
