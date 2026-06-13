#!/bin/bash

# Database Restore Test Script
# Validates backup integrity by restoring to a temporary database
# Run this immediately after backup to prove recovery is possible
# Usage: ./scripts/restore-test.sh [backup_file]

set -euo pipefail

DB_USER="${DB_USER:-retail}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5433}"
TEST_DB_NAME="retail_ims_restore_test"
BACKUP_DIR="${BACKUP_DIR:-/opt/Inventory-control/backups}"

# Log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Cleanup function
cleanup() {
  log "Cleaning up test database..."
  PGPASSWORD="${DB_PASSWORD:-retail}" dropdb \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    "$TEST_DB_NAME" 2>/dev/null || true
  log "Test database dropped"
}

# Trap exit to always cleanup
trap cleanup EXIT

# Get backup file
if [ $# -eq 1 ]; then
  BACKUP_FILE="$1"
else
  # Use most recent backup
  BACKUP_FILE=$(find "$BACKUP_DIR" -name "retail_ims_*.sql.gz" -type f -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)
fi

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  log "ERROR: No backup file found at $BACKUP_FILE"
  exit 1
fi

log "=== RESTORE TEST STARTED ==="
log "Backup file: $BACKUP_FILE"
log "Test database: $TEST_DB_NAME"

# Create test database
log "Creating test database..."
if ! PGPASSWORD="${DB_PASSWORD:-retail}" createdb \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  "$TEST_DB_NAME"; then
  log "ERROR: Failed to create test database"
  exit 1
fi

log "Test database created"

# Restore from backup
log "Restoring backup..."
START_TIME=$(date +%s)

if ! /bin/gunzip < "$BACKUP_FILE" | PGPASSWORD="${DB_PASSWORD:-retail}" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$TEST_DB_NAME" \
  -q > /dev/null 2>&1; then
  log "ERROR: Restore failed"
  exit 1
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

log "Restore complete (${DURATION}s)"

# Validation queries
log "=== VALIDATION QUERIES ==="

declare -a QUERIES=(
  "SELECT COUNT(*) as user_count FROM users;"
  "SELECT COUNT(*) as company_count FROM companies;"
  "SELECT COUNT(*) as product_count FROM products;"
  "SELECT COUNT(*) as audit_count FROM audit_logs;"
  "SELECT COUNT(*) as migration_count FROM _prisma_migrations;"
  "SELECT action, COUNT(*) FROM audit_logs GROUP BY action ORDER BY action;"
  "SELECT action, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 5;"
)

VALIDATION_FAILED=0

for query in "${QUERIES[@]}"; do
  log "Query: $query"
  if result=$(PGPASSWORD="${DB_PASSWORD:-retail}" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$TEST_DB_NAME" \
    -t -c "$query" 2>&1); then
    log "Result: $result"
  else
    log "ERROR: Query failed"
    VALIDATION_FAILED=1
  fi
  log ""
done

if [ $VALIDATION_FAILED -eq 0 ]; then
  log "=== RESTORE TEST SUCCESSFUL ==="
  log "Backup is valid and recoverable"
  exit 0
else
  log "=== RESTORE TEST FAILED ==="
  log "Backup validation failed - this backup may not be usable"
  exit 1
fi
