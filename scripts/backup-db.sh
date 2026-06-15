#!/bin/bash

# Database Backup Script
# Dumps PostgreSQL, compresses, keeps 7 days of backups
# Schedule: crontab -e → 0 2 * * * /path/to/backup-db.sh

set -euo pipefail

DB_NAME="retail_ims"
DB_USER="${DB_USER:-retail}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5433}"
BACKUP_DIR="${BACKUP_DIR:-/opt/Inventory-control/backups}"
RETENTION_DAYS=7
LOG_FILE="$BACKUP_DIR/backup.log"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Timestamp
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Backup started ==="
log "Database: $DB_NAME"
log "Output: $BACKUP_FILE"

# Start timer
START_TIME=$(date +%s)

# Dump and compress
if PGPASSWORD="${DB_PASSWORD:-retail}" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  | gzip > "$BACKUP_FILE"; then

  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

  log "Backup success"
  log "Size: $FILE_SIZE"
  log "Duration: ${DURATION}s"

  # Verify archive integrity
  log "Verifying archive integrity..."
  if /bin/gzip -t "$BACKUP_FILE" 2>&1; then
    log "Archive verification passed"
  else
    log "ERROR: Archive verification failed - backup is corrupted"
    exit 1
  fi

  # Cleanup old backups
  log "Cleaning backups older than $RETENTION_DAYS days"
  DELETED=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
  log "Deleted $DELETED old backups"

  log "=== Backup complete ==="
  exit 0
else
  log "ERROR: Backup failed"
  log "=== Backup failed ==="
  exit 1
fi
