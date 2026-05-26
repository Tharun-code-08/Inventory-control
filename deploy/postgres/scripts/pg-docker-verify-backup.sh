#!/usr/bin/env bash
# Verify Docker backups are recent and present.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib-docker.sh"

THRESHOLD_SECONDS=$((2 * 60 * 60)) # 2 hours

file_age_seconds() {
  local file="$1"
  local mtime
  mtime="$(stat -c %Y "$file" 2>/dev/null || stat -f %m "$file")"
  echo $(( $(date +%s) - mtime ))
}

check_recent() {
  local file="$1"
  local label="$2"
  [[ -f "$file" ]] || fail "Missing ${label}: ${file}"
  local age
  age="$(file_age_seconds "$file")"
  if [[ "$age" -gt "$THRESHOLD_SECONDS" ]]; then
    fail "${label} is too old (${age}s): ${file}"
  fi
  log "${label} OK (${age}s old): ${file}"
}

require_cmd stat
ensure_dirs

check_recent "${FULL_DIR}/latest.dump" "Full backup"

companies_raw="$(docker_psql -At -c "select coalesce(nullif(company_code, ''), substring(id, 1, 8)) from companies order by 1" || true)"
if [[ -n "${companies_raw// }" ]]; then
  while IFS= read -r code; do
    [[ -z "$code" ]] && continue
    check_recent "${COMPANY_DIR}/${code}/latest.dump" "Company backup (${code})"
  done <<<"$companies_raw"
else
  log "No companies found; skipping company freshness checks"
fi

log "Backup verification completed"
