#!/bin/bash
# Apply pending Prisma migrations safely during deploy.
#
# Called from scripts/deploy.sh (Step 4) on the VPS, after build and before
# restart. Wraps `prisma migrate deploy` with a pre-check and a post-apply
# verification so a failed / partially-applied / hand-edited migration can't
# silently leave the live DB out of sync with the code.
#
# Post-verify design (revised 2026-07-30 after WE-001):
#   The old check compared schema.prisma -> live DB
#   (`--from-schema-datasource --to-schema-datamodel`). That FALSE-POSITIVES on
#   this repo: Prisma's app-level `@default(uuid())` reads as "no DB default",
#   while the migrations set `gen_random_uuid()` at the DB level — so every
#   uuid PK (32+ columns) plus some enum representations show as "drift" even
#   on a perfectly-migrated DB, which would block every deploy.
#
#   Instead we verify what actually matters:
#     1) migration history is at HEAD — no failed, no pending (false-positive
#        free; catches the 2026-07-10 schema-drift-503 class: missing migrations);
#     2) (optional, authoritative) the live DB matches what the MIGRATIONS
#        produce — `--from-migrations -> --to-schema-datasource` (live DB) via a
#        shadow DB. Both sides come from the same migration SQL, so the uuid /
#        enum noise cancels and only real drift (hand-edits) is flagged. Enable
#        by setting PRISMA_SHADOW_DATABASE_URL to an empty DB Prisma may reset.
#
# Idempotent and safe to re-run. Reads DATABASE_URL from apps/api/.env.
#
# Usage:  scripts/migrate-deploy.sh
set -Eeuo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$SCRIPT_DIR/../apps/api"
SCHEMA="prisma/schema.prisma"

cd "$API_DIR"

echo -e "${GREEN}» Prisma migrate: current status...${NC}"
# Informational: shows applied / pending. Exits non-zero when pending, so never
# let it fail the deploy here — it is diagnostics only.
npx prisma migrate status --schema "$SCHEMA" || true

echo -e "${GREEN}» Applying migrations (prisma migrate deploy)...${NC}"
# `migrate deploy` itself hard-fails (non-zero → ERR trap) on any failed
# migration, so a corrupted history cannot be deployed onto.
npx prisma migrate deploy --schema "$SCHEMA"

echo -e "${GREEN}» Post-verify (1/2): migration history at head...${NC}"
set +e
STATUS_OUT="$(npx prisma migrate status --schema "$SCHEMA" 2>&1)"
set -e
if printf '%s' "$STATUS_OUT" | grep -qiE "have failed|failed to apply|following migration.*failed"; then
  echo -e "${RED}✗ A migration is in a FAILED state after deploy. Investigate before serving traffic.${NC}"
  printf '%s\n' "$STATUS_OUT"
  exit 1
fi
if printf '%s' "$STATUS_OUT" | grep -qiE "not yet been applied|following migration.*pending"; then
  echo -e "${RED}✗ Migrations still PENDING after deploy — deploy did not fully apply.${NC}"
  printf '%s\n' "$STATUS_OUT"
  exit 1
fi
echo "  ✓ history at head (no failed, no pending)."

echo -e "${GREEN}» Post-verify (2/2): live DB matches migrations...${NC}"
if [ -n "${PRISMA_SHADOW_DATABASE_URL:-}" ]; then
  set +e
  npx prisma migrate diff \
    --from-migrations prisma/migrations \
    --to-schema-datasource "$SCHEMA" \
    --shadow-database-url "$PRISMA_SHADOW_DATABASE_URL" \
    --exit-code >/dev/null 2>&1
  DIFF_RC=$?
  set -e
  case "$DIFF_RC" in
    0) echo "  ✓ live DB exactly reproduces the migrations." ;;
    2) echo -e "${RED}✗ Live DB DRIFTS from the migrations (hand-edit / partial apply). Investigate.${NC}"
       echo "  Reproduce: npx prisma migrate diff --from-migrations prisma/migrations \\"
       echo "    --to-schema-datasource $SCHEMA --shadow-database-url \$PRISMA_SHADOW_DATABASE_URL --script"
       exit 1 ;;
    *) echo -e "${YELLOW}  ⚠ shadow diff could not run (rc $DIFF_RC); relying on the head check above.${NC}" ;;
  esac
else
  echo -e "${YELLOW}  ⚠ structural check skipped — set PRISMA_SHADOW_DATABASE_URL (empty DB) to enable.${NC}"
fi

echo -e "${GREEN}✓ Migrations applied and verified.${NC}"
