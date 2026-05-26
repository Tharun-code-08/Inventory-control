#!/usr/bin/env bash
# Hourly full database dump from a Dockerized Postgres container.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib-docker.sh"

require_cmd docker
require_cmd date
ensure_dirs

STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
TMP_IN_CONTAINER="/tmp/full-${STAMP}.dump"
TARGET="${FULL_DIR}/full-${STAMP}.dump"

log "Starting full Docker backup -> ${TARGET}"

# Clean any previous temp file
docker_exec sh -c "rm -f '${TMP_IN_CONTAINER}'"

# Dump inside the container, then copy out
docker_pg_dump -F c -f "${TMP_IN_CONTAINER}" "${PGDATABASE}"
docker_cp_from_container "${TMP_IN_CONTAINER}" "${TARGET}"

checksum_file "${TARGET}"
ln -sfn "${TARGET}" "${FULL_DIR}/latest.dump"

log "Full backup completed: ${TARGET}"
