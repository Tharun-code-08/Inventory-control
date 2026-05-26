#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/retail-ims/postgres-backup.env}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

: "${BACKUP_ROOT:=/var/backups/postgres}"
: "${FULL_DIR:=${BACKUP_ROOT}/full}"
: "${LOGICAL_DIR:=${BACKUP_ROOT}/logical}"
: "${WAL_DIR:=${BACKUP_ROOT}/wal}"
: "${LOG_DIR:=${BACKUP_ROOT}/logs}"
: "${PGHOST:=127.0.0.1}"
: "${PGPORT:=5432}"
: "${PGUSER:=postgres}"
: "${PGDATABASE:=retail_ims}"

export PGHOST PGPORT PGUSER PGDATABASE

timestamp() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

log() {
  local msg="[$(timestamp)] $*"
  echo "$msg"
  mkdir -p "$LOG_DIR"
  echo "$msg" >>"${LOG_DIR}/backup.log"
}

fail() {
  log "ERROR: $*"
  if [[ -n "${ALERT_CMD:-}" ]] && command -v bash >/dev/null 2>&1; then
    bash -lc "$ALERT_CMD $(printf '%q' "$*")" || true
  fi
  exit 1
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || fail "Required command not found: $cmd"
}

ensure_dirs() {
  mkdir -p "$FULL_DIR" "$LOGICAL_DIR" "$WAL_DIR" "$LOG_DIR"
  chmod 750 "$BACKUP_ROOT" "$FULL_DIR" "$LOGICAL_DIR" "$WAL_DIR" "$LOG_DIR" 2>/dev/null || true
}

checksum_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" >"${file}.sha256"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" >"${file}.sha256"
  else
    log "WARN: no sha256 tool; skipping checksum for $file"
  fi
}

verify_checksum() {
  local file="$1"
  local sum_file="${file}.sha256"
  [[ -f "$sum_file" ]] || fail "Missing checksum file: $sum_file"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c "$sum_file" >/dev/null
  else
    shasum -a 256 -c "$sum_file" >/dev/null
  fi
}

maybe_rsync_offsite() {
  local src="$1"
  if [[ -z "${RSYNC_TARGET:-}" ]]; then
    return 0
  fi
  require_cmd rsync
  log "Syncing ${src} -> ${RSYNC_TARGET}"
  rsync -az --delete-after "$src/" "${RSYNC_TARGET%/}/$(basename "$src")/"
}

maybe_s3_sync() {
  local src="$1"
  if [[ -z "${S3_BUCKET:-}" ]]; then
    return 0
  fi
  require_cmd aws
  local dest="${S3_BUCKET%/}/$(basename "$src")/"
  log "Uploading ${src} -> ${dest}"
  if [[ -n "${S3_ENDPOINT:-}" ]]; then
    aws s3 sync "$src" "$dest" --endpoint-url "$S3_ENDPOINT" ${AWS_PROFILE:+--profile "$AWS_PROFILE"}
  else
    aws s3 sync "$src" "$dest" ${AWS_PROFILE:+--profile "$AWS_PROFILE"}
  fi
}
