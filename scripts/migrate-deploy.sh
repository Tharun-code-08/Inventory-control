#!/bin/bash
# Apply pending Prisma migrations safely during deploy.
#
# Called from scripts/deploy.sh (Step 4) on the VPS, after build and before
# restart. Wraps `prisma migrate deploy` with a drift pre-check and a post-apply
# verification so a hand-edited or partially-applied migration can't silently
# leave the live schema out of sync with the codebase.
#
# Why `migrate diff` and not `migrate status`: the 2026-07-10 prod schema-drift
# 503 incident showed `migrate status` can report "up to date" while the live DB
# actually diverges from the schema. `migrate diff --from-schema-datasource
# (live DB) --to-schema-datamodel (schema.prisma) --exit-code` compares the real
# database against the intended schema and is the source of truth:
#   exit 0 = live DB matches schema, exit 2 = they differ, exit 1 = error.
#
# Idempotent and safe to re-run: `migrate deploy` only applies un-applied
# migrations. Reads DATABASE_URL from apps/api/.env (Prisma auto-loads it), so
# the target DB is whatever that environment's .env points at (prod vs staging).
#
# Usage:  scripts/migrate-deploy.sh
set -Eeuo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$SCRIPT_DIR/../apps/api"
SCHEMA="prisma/schema.prisma"

cd "$API_DIR"

# Compare the live database against the schema. Returns the diff exit code
# (0 = in sync, 2 = differs) without tripping `set -e`.
schema_diff_code() {
  set +e
  npx prisma migrate diff \
    --from-schema-datasource "$SCHEMA" \
    --to-schema-datamodel "$SCHEMA" \
    --exit-code >/dev/null 2>&1
  local rc=$?
  set -e
  return "$rc"
}

echo -e "${GREEN}» Prisma migrate: checking for pending schema changes...${NC}"

# Informational: show which migrations Prisma considers applied/pending.
# `migrate status` exits non-zero when migrations are pending, so never let it
# fail the deploy — it is diagnostics only.
npx prisma migrate status --schema "$SCHEMA" || true

set +e; schema_diff_code; PRE_CODE=$?; set -e
case "$PRE_CODE" in
  0) echo "  ✓ Live database already matches the schema; migrate deploy will be a no-op." ;;
  2) echo -e "  ${YELLOW}⟳ Live database differs from schema — applying migrations.${NC}" ;;
  *) echo -e "  ${RED}✗ Could not compare schema to database (diff exit $PRE_CODE).${NC}"; exit 1 ;;
esac

echo -e "${GREEN}» Applying migrations (prisma migrate deploy)...${NC}"
npx prisma migrate deploy --schema "$SCHEMA"

# Post-verify: after a clean deploy the live DB must exactly match the schema.
# A remaining diff means a hand-edited migration SQL diverges from schema.prisma
# (the exact failure mode behind the drift incident) — fail loudly rather than
# restart the app onto a mismatched database.
echo -e "${GREEN}» Verifying live schema matches the codebase...${NC}"
set +e; schema_diff_code; POST_CODE=$?; set -e
if [ "$POST_CODE" -ne 0 ]; then
  echo -e "${RED}✗ Schema drift after migrate deploy (diff exit $POST_CODE).${NC}"
  echo -e "${RED}  A migration's SQL does not reproduce schema.prisma. Investigate before serving traffic.${NC}"
  echo "  Reproduce locally: npx prisma migrate diff \\"
  echo "    --from-schema-datasource $SCHEMA --to-schema-datamodel $SCHEMA --script"
  exit 1
fi

echo -e "${GREEN}✓ Migrations applied and live schema verified in sync.${NC}"
