#!/usr/bin/env bash
# Post-deployment verification for the production API.
# Runs four independent checks; exits non-zero on the first failure.
#
# Required environment variables (set by the GitHub Actions workflow):
#   DEPLOY_KEY             — private SSH key content
#   DEPLOY_HOST            — VPS hostname or IP
#   DEPLOY_USER            — SSH username
#   DEPLOY_HOST_KNOWN_KEY  — known_hosts entry (optional; enables strict host-key check)
#   EXPECTED_SHA           — full commit SHA that was deployed
#
# Optional:
#   PRODUCTION_URL         — public HTTPS base URL (check 4 skipped if absent)
#   API_PORT               — internal API port (default: 3001)
#   MAX_ATTEMPTS           — retry limit per check (default: 10)
#   RETRY_DELAY            — seconds between retries (default: 3)
#
# Usage:
#   DEPLOY_HOST=prod.example.com DEPLOY_USER=deploy EXPECTED_SHA=abc123 \
#     bash scripts/verify-deployment.sh

set -euo pipefail

HOST="$(printf '%s' "${DEPLOY_HOST:-}" | tr -d '[:space:]')"
USER_NAME="$(printf '%s' "${DEPLOY_USER:-}" | tr -d '[:space:]')"
PORT="${API_PORT:-3001}"
MAX="${MAX_ATTEMPTS:-10}"
DELAY="${RETRY_DELAY:-3}"

if [ -z "$HOST" ] || [ -z "$USER_NAME" ]; then
  echo "❌ DEPLOY_HOST and DEPLOY_USER must be set"
  exit 1
fi

# ── SSH setup ────────────────────────────────────────────────────────────────

mkdir -p ~/.ssh
if [ -n "${DEPLOY_KEY:-}" ]; then
  printf '%s\n' "$DEPLOY_KEY" > ~/.ssh/deploy_key
  chmod 600 ~/.ssh/deploy_key
fi

if [ -n "${DEPLOY_HOST_KNOWN_KEY:-}" ]; then
  printf '%s\n' "$DEPLOY_HOST_KNOWN_KEY" >> ~/.ssh/known_hosts
  chmod 600 ~/.ssh/known_hosts
  SSH_STRICT="StrictHostKeyChecking=yes"
else
  SSH_STRICT="StrictHostKeyChecking=accept-new"
fi

ssh_curl() {
  # ssh_curl <path>
  # Runs `curl -sf http://localhost:<PORT><path>` on the remote host.
  # No eval — arguments are passed directly to ssh and curl.
  local path="$1"
  ssh -i ~/.ssh/deploy_key \
    -o "$SSH_STRICT" \
    -o ConnectTimeout=15 \
    -o ServerAliveInterval=10 \
    -o BatchMode=yes \
    "$USER_NAME@$HOST" \
    curl -sf "http://localhost:${PORT}${path}"
}

# ── Helpers ──────────────────────────────────────────────────────────────────

# fetch_internal <label> <path>
# Calls ssh_curl with retries. Validates JSON; sets FETCH_RESULT on success.
fetch_internal() {
  local label="$1" path="$2"
  local body="" attempt=0
  while [ "$attempt" -lt "$MAX" ]; do
    attempt=$((attempt + 1))
    body=$(ssh_curl "$path" 2>/dev/null) && break
    echo "  attempt $attempt/$MAX failed, retrying in ${DELAY}s..."
    [ "$attempt" -lt "$MAX" ] && sleep "$DELAY"
  done
  _validate_json "$label" "$body"
  FETCH_RESULT="$body"
}

# fetch_public <label> <url>
# Calls curl directly (no SSH) with retries. Returns HTTP status code in FETCH_RESULT.
fetch_public() {
  local label="$1" url="$2"
  local code="" attempt=0
  while [ "$attempt" -lt "$MAX" ]; do
    attempt=$((attempt + 1))
    code=$(curl -sf -o /dev/null -w '%{http_code}' "$url" 2>/dev/null) && break
    echo "  attempt $attempt/$MAX failed, retrying in ${DELAY}s..."
    [ "$attempt" -lt "$MAX" ] && sleep "$DELAY"
  done
  if [ -z "$code" ]; then
    echo "❌ $label: all $MAX attempts failed — endpoint unreachable"
    return 1
  fi
  FETCH_RESULT="$code"
}

# _validate_json <label> <body>
# Exits with a diagnostic if body is empty or not valid JSON.
_validate_json() {
  local label="$1" body="$2"
  if [ -z "$body" ]; then
    echo "❌ $label: all $MAX attempts failed — endpoint unreachable or returned empty"
    exit 1
  fi
  node -e "
    let s='';
    process.stdin.on('data',d=>s+=d).on('end',()=>{
      try { JSON.parse(s); }
      catch(e) {
        const preview=s.slice(0,120).replace(/\n/g,' ');
        process.stderr.write('❌ ${label}: response is not valid JSON.\n  First 120 chars: '+preview+'\n');
        process.exit(1);
      }
    })
  " <<< "$body"
}

# extract <json> <field>
# Reads a top-level string field from a JSON body via Node.
extract() {
  local json="$1" field="$2"
  node -e "process.stdin.on('data',d=>process.stdout.write(JSON.parse(d)['$field']??''))" <<< "$json"
}

# ── Checks ───────────────────────────────────────────────────────────────────

echo "=== Post-deployment verification ==="
echo "Host: $USER_NAME@$HOST  Port: $PORT"
echo ""

# [1/4] Liveness
echo "--- [1/4] Liveness (/api/v1/health) ---"
fetch_internal "Liveness" "/api/v1/health"
echo "$FETCH_RESULT"
STATUS=$(extract "$FETCH_RESULT" status)
[ "$STATUS" = "ok" ] || { echo "❌ Liveness: status='$STATUS' (expected 'ok')"; exit 1; }
echo "✓ Liveness: status=ok"
echo ""

# [2/4] Readiness
echo "--- [2/4] Readiness (/api/v1/health/ready) ---"
fetch_internal "Readiness" "/api/v1/health/ready"
echo "$FETCH_RESULT"
DB=$(extract "$FETCH_RESULT" database)
[ "$DB" = "connected" ] || { echo "❌ Readiness: database='$DB' (expected 'connected')"; exit 1; }
echo "✓ Readiness: database=connected"
echo ""

# [3/4] Identity
echo "--- [3/4] Identity (/api/v1/health/live) ---"
fetch_internal "Identity" "/api/v1/health/live"
echo "$FETCH_RESULT"
ACTUAL_SHA=$(extract "$FETCH_RESULT" commit)
# Normalize to 40 chars — guards against short-SHA vs full-SHA mismatches.
EXPECTED_NORM="${EXPECTED_SHA:0:40}"
ACTUAL_NORM="${ACTUAL_SHA:0:40}"
if [ "$ACTUAL_NORM" = "unknown" ] || [ -z "$ACTUAL_NORM" ]; then
  echo "⚠️  Commit SHA not set (APP_COMMIT_SHA env var missing from PM2). Identity skipped."
elif [ "$ACTUAL_NORM" != "$EXPECTED_NORM" ]; then
  echo "❌ Identity: running=$ACTUAL_NORM expected=$EXPECTED_NORM"
  exit 1
else
  echo "✓ Identity: commit=${ACTUAL_NORM:0:12}... matches deployed SHA"
fi
echo ""

# [4/4] Public URL
PRODUCTION_URL="${PRODUCTION_URL:-}"
if [ -z "$PRODUCTION_URL" ]; then
  echo "--- [4/4] Public URL check skipped (PRODUCTION_URL not set) ---"
  echo "    Set it at Settings → Variables → PRODUCTION_URL (e.g. https://api.example.com)"
else
  echo "--- [4/4] Public URL ($PRODUCTION_URL/api/v1/health) ---"
  fetch_public "Public URL" "$PRODUCTION_URL/api/v1/health"
  CODE="$FETCH_RESULT"
  [ "$CODE" = "200" ] || { echo "❌ Public URL: HTTP $CODE (expected 200) — check nginx, TLS, or firewall"; exit 1; }
  echo "✓ Public URL: HTTP 200"
fi

echo ""
echo "=== All checks passed ==="
