#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/retail-ims/postgres-backup.env}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

: "${DOCKER_CONTAINER:?DOCKER_CONTAINER is required (e.g., docker-postgres-1)}"
: "${BACKUP_ROOT:=/var/backups/postgres}"
: "${FULL_DIR:=${BACKUP_ROOT}/full}"
: "${COMPANY_DIR:=${BACKUP_ROOT}/companies}"
: "${LOG_DIR:=${BACKUP_ROOT}/logs}"
: "${PGHOST:=127.0.0.1}"
: "${PGPORT:=5432}"
: "${PGUSER:=postgres}"
: "${PGDATABASE:=retail_ims}"
: "${RETENTION_DAYS:=30}"

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
  mkdir -p "$FULL_DIR" "$COMPANY_DIR" "$LOG_DIR"
  chmod 750 "$BACKUP_ROOT" "$FULL_DIR" "$COMPANY_DIR" "$LOG_DIR" 2>/dev/null || true
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

docker_exec() {
  docker exec "$DOCKER_CONTAINER" "$@"
}

docker_exec_env() {
  docker exec -e PGPASSWORD="${PGPASSWORD:-}" "$DOCKER_CONTAINER" "$@"
}

docker_pg_dump() {
  docker_exec_env pg_dump -U "$PGUSER" -h "$PGHOST" -p "$PGPORT" "$@"
}

docker_psql() {
  docker_exec_env psql -U "$PGUSER" -h "$PGHOST" -p "$PGPORT" -d "$PGDATABASE" "$@"
}

docker_cp_from_container() {
  local src="$1"
  local dest="$2"
  docker cp "${DOCKER_CONTAINER}:${src}" "$dest"
}
