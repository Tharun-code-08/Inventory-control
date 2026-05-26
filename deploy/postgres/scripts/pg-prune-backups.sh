#!/usr/bin/env bash
# Prune old full/logical/WAL backups according to retention env vars.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib.sh"

: "${RETENTION_FULL_DAYS:=14}"
: "${RETENTION_LOGICAL_DAYS:=30}"
: "${RETENTION_WAL_DAYS:=14}"

ensure_dirs

prune_dir() {
  local dir="$1"
  local days="$2"
  local label="$3"
  local count
  count="$(find "$dir" -mindepth 1 -maxdepth 1 -type f -mtime +"$days" 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "$count" -gt 0 ]]; then
    find "$dir" -mindepth 1 -maxdepth 1 -type f -mtime +"$days" -print -delete
    log "Pruned ${count} ${label} file(s) older than ${days} days from ${dir}"
  else
    log "No ${label} files to prune in ${dir}"
  fi
}

prune_dir "$FULL_DIR" "$RETENTION_FULL_DAYS" "physical full"
prune_dir "$LOGICAL_DIR" "$RETENTION_LOGICAL_DAYS" "logical dump"
prune_dir "$WAL_DIR" "$RETENTION_WAL_DAYS" "WAL"

log "Prune completed"
