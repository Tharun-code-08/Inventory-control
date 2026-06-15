# Database Backup Administration Guide

**For: System Administrators & DevOps**

---

## Architecture

### Backup System Components

```
┌─────────────────────────────────────────────────────┐
│          Cron Job (Daily 2:00 AM)                   │
│  0 2 * * * /opt/Inventory-control/scripts/backup-db.sh
└────────────────────┬────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │  backup-db.sh Script   │
        │  - pg_dump             │
        │  - gzip compress       │
        │  - integrity verify    │
        │  - cleanup old backups │
        └────────────┬───────────┘
                     │
                     ↓
        ┌────────────────────────────────────┐
        │   /opt/Inventory-control/backups/  │
        │   - retail_ims_YYYY-MM-DD_HH.sql.gz
        │   - backup.log                     │
        └────────────────────────────────────┘
```

### Scripts Location

```
/opt/Inventory-control/
├── scripts/
│   ├── backup-db.sh          # Runs daily at 2:00 AM
│   └── restore-test.sh       # Manual restore validation
├── backups/
│   ├── retail_ims_2026-06-13_02-00-00.sql.gz
│   ├── retail_ims_2026-06-12_02-00-00.sql.gz
│   └── backup.log
```

---

## Backup Script Details

### File: `scripts/backup-db.sh`

**What it does:**
1. Creates PostgreSQL dump of `retail_ims` database
2. Compresses with gzip (136 KB typical size)
3. Verifies gzip archive integrity
4. Deletes backups older than 7 days
5. Logs all actions to `backups/backup.log`

**Environment Variables (optional):**

```bash
DB_NAME="retail_ims"              # Database name (default: retail_ims)
DB_USER="${DB_USER:-retail}"      # Database user (default: retail)
DB_HOST="${DB_HOST:-127.0.0.1}"   # Database host (default: 127.0.0.1)
DB_PORT="${DB_PORT:-5433}"        # Database port (default: 5433)
DB_PASSWORD="${DB_PASSWORD:-retail}" # Database password (default: retail)
BACKUP_DIR="${BACKUP_DIR:-...}"   # Backup directory (default: ./backups)
```

**To override at cron time:**

```bash
# In crontab -e:
0 2 * * * DB_PASSWORD="secure_pass" /opt/Inventory-control/scripts/backup-db.sh >> /var/log/retail-backup.log 2>&1
```

**Exit Codes:**

```
0 = Success
1 = Backup failed OR archive verification failed
```

### Cron Configuration

**Current schedule:** 2:00 AM daily (UTC or server timezone)

```bash
# View current cron job
crontab -l

# Edit cron job
crontab -e

# Change time (e.g., 3:00 AM)
0 3 * * * /opt/Inventory-control/scripts/backup-db.sh >> /var/log/retail-backup.log 2>&1
```

**Cron Syntax Reference:**

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
0 2 * * * /path/to/script.sh
```

**Common schedules:**

```bash
0 2 * * *     # Every day at 2:00 AM
0 3 * * *     # Every day at 3:00 AM
0 2 * * 0     # Every Sunday at 2:00 AM
0 2 1 * *     # First day of month at 2:00 AM
0 2,14 * * *  # Every 12 hours (2 AM and 2 PM)
*/6 * * * *   # Every 6 hours
```

---

## Restore Script Details

### File: `scripts/restore-test.sh`

**What it does:**
1. Finds latest backup (or uses specified file)
2. Creates temporary test database (`retail_ims_restore_test`)
3. Restores backup to test database
4. Runs 7 validation queries
5. Drops test database automatically

**Usage:**

```bash
# Test latest backup
./scripts/restore-test.sh

# Test specific backup
./scripts/restore-test.sh /opt/Inventory-control/backups/retail_ims_2026-06-13_02-00-00.sql.gz

# With environment variables
DB_PASSWORD="custom_pass" ./scripts/restore-test.sh
```

**Exit Codes:**

```
0 = Restore successful, all validations passed
1 = Restore failed OR validation queries failed
```

**Validation Queries:**

The script runs:

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM companies;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM audit_logs;
SELECT COUNT(*) FROM _prisma_migrations;
SELECT action, COUNT(*) FROM audit_logs GROUP BY action;
SELECT action, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 5;
```

These verify:
- All tables exist
- Data was restored
- Recent activity is present
- Schema is consistent

---

## Monitoring & Logging

### Backup Log Location

```
/opt/Inventory-control/backups/backup.log
/var/log/retail-backup.log (optional, if redirected in cron)
```

### Log Format

```
[2026-06-13 11:16:33] === Backup started ===
[2026-06-13 11:16:33] Database: retail_ims
[2026-06-13 11:16:33] Output: /opt/Inventory-control/backups/retail_ims_2026-06-13_11-16-33.sql.gz
[2026-06-13 11:16:34] Backup success
[2026-06-13 11:16:34] Size: 136K
[2026-06-13 11:16:34] Duration: 1s
[2026-06-13 11:16:34] Verifying archive integrity...
[2026-06-13 11:16:34] Archive verification passed
[2026-06-13 11:16:34] Cleaning backups older than 7 days
[2026-06-13 11:16:34] Deleted 0 old backups
[2026-06-13 11:16:34] === Backup complete ===
```

### Monitoring Backup Execution

**Check last 20 log lines:**

```bash
tail -20 /opt/Inventory-control/backups/backup.log
```

**Check backup file size trend:**

```bash
ls -lh /opt/Inventory-control/backups/*.sql.gz | awk '{print $9, $5}'
```

**Monitor disk space:**

```bash
df -h /opt/Inventory-control
du -sh /opt/Inventory-control/backups
```

### Setting Up Email Alerts (Optional)

**Alert when backup fails:**

```bash
# In crontab
0 2 * * * /opt/Inventory-control/scripts/backup-db.sh >> /var/log/retail-backup.log 2>&1 || echo "Backup failed on $(date)" | mail -s "ALERT: Database Backup Failed" admin@example.com
```

**Daily status report:**

```bash
# Send backup status every morning
0 8 * * * tail -5 /opt/Inventory-control/backups/backup.log | mail -s "Daily Backup Status" admin@example.com
```

---

## Database Configuration

### PostgreSQL Connection Parameters

```bash
# Current configuration
DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=retail_ims
DB_USER=retail
DB_PASSWORD=retail
```

**Verify connectivity:**

```bash
psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims -c "SELECT version();"
```

### User Permissions Required

The `retail` database user needs:

```sql
-- Grant appropriate permissions
ALTER ROLE retail SUPERUSER;

-- Or minimum permissions (more restrictive):
GRANT CONNECT ON DATABASE retail_ims TO retail;
GRANT USAGE ON SCHEMA public TO retail;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO retail;
```

### Backup User Best Practice

Create dedicated backup user:

```bash
sudo -u postgres psql << EOF
CREATE ROLE backup_user WITH PASSWORD 'secure_backup_password' LOGIN;
ALTER ROLE backup_user SUPERUSER;
GRANT CONNECT ON DATABASE retail_ims TO backup_user;
EOF
```

Then update `backup-db.sh`:

```bash
DB_USER="backup_user"
DB_PASSWORD="secure_backup_password"
```

---

## Performance & Storage

### Typical Backup Characteristics

```
Database Size     : ~136 KB (compressed)
Uncompressed Size : ~3-5 MB
Backup Duration   : ~1 second
Restore Duration  : ~1-2 seconds
Compression Ratio : 25:1 (very good)
```

### Storage Requirements

```
7 days × 136 KB = ~1 MB total storage
30 days = ~4 MB total storage
365 days = ~50 MB total storage
```

**Verify disk space:**

```bash
df -h /opt/Inventory-control
# Should show at least 1 GB available

du -sh /opt/Inventory-control/backups
# Should show < 2 MB with 7-day retention
```

### If Disk Space is Limited

**Option 1: Reduce retention period (default: 7 days)**

Edit `backup-db.sh`:

```bash
RETENTION_DAYS=3  # Keep only 3 days of backups
```

**Option 2: Increase backup frequency to hourly**

```bash
# In crontab (backup every hour)
0 * * * * /opt/Inventory-control/scripts/backup-db.sh >> /var/log/retail-backup.log 2>&1

# This creates ~24 × 136 KB = ~3 MB per day, 21 MB per week (7-day retention)
```

**Option 3: Archive old backups to external storage**

```bash
# Monthly archive to S3 or external drive
0 0 1 * * tar czf /mnt/backup-archive/retail-$(date +%Y%m).tar.gz /opt/Inventory-control/backups/ && find /opt/Inventory-control/backups -mtime +30 -delete
```

---

## Disaster Recovery Procedures

### Full Database Recovery

```bash
# 1. Stop application
pm2 stop all

# 2. Backup current (corrupted) state
CURRENT_TIME=$(date +%Y-%m-%d_%H-%M-%S)
pg_dump -h 127.0.0.1 -p 5433 -U retail -d retail_ims | \
  gzip > /opt/Inventory-control/backups/corrupted-$CURRENT_TIME.sql.gz

# 3. Find desired backup
ls -lh /opt/Inventory-control/backups/*.sql.gz

# 4. Restore
gunzip < /opt/Inventory-control/backups/retail_ims_2026-06-13_02-00-00.sql.gz | \
  psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims

# 5. Verify
psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims -c "SELECT COUNT(*) FROM audit_logs;"

# 6. Restart
pm2 start all
pm2 log
```

### Point-in-Time Recovery (Manual)

If you need a backup from a specific date:

```bash
# List backups by date
ls -lh /opt/Inventory-control/backups/ | grep "2026-06-12"

# Restore from specific date
gunzip < /opt/Inventory-control/backups/retail_ims_2026-06-12_02-00-00.sql.gz | \
  psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims
```

### Backup to External Storage

**Copy to external disk/NAS:**

```bash
# One-time copy
cp /opt/Inventory-control/backups/*.sql.gz /mnt/external-backup/

# Automated daily sync (add to crontab)
0 3 * * * rsync -av /opt/Inventory-control/backups/ /mnt/external-backup/ --delete-after
```

**Copy to cloud (AWS S3 example):**

```bash
# Install aws-cli
apt-get install awscli

# Upload latest backup
0 3 * * * aws s3 cp /opt/Inventory-control/backups/ s3://your-bucket/retail-backups/ --recursive --exclude "*" --include "*.sql.gz"
```

---

## Testing & Validation

### Weekly Backup Test

Add to crontab:

```bash
# Run backup test every Sunday at 3:00 AM
0 3 * * 0 /opt/Inventory-control/scripts/restore-test.sh >> /var/log/restore-test.log 2>&1
```

### Backup Integrity Verification

Manual verification:

```bash
# Check gzip integrity
gzip -t /opt/Inventory-control/backups/retail_ims_2026-06-13_02-00-00.sql.gz
echo $?  # Should output 0

# Or use restore test
/opt/Inventory-control/scripts/restore-test.sh /opt/Inventory-control/backups/retail_ims_2026-06-13_02-00-00.sql.gz
```

### Restore Speed Test

Time a restore:

```bash
time gunzip < /opt/Inventory-control/backups/retail_ims_2026-06-13_02-00-00.sql.gz | \
  psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims > /dev/null 2>&1
```

Expected: < 3 seconds

---

## Troubleshooting

### Backup Not Running

```bash
# Check if cron is running
systemctl status cron  # or: systemctl status crond

# Verify cron job exists
crontab -l

# Check cron logs
grep CRON /var/log/syslog | tail -20
# or on systemd systems:
journalctl -u cron | tail -20

# Manually test script
/opt/Inventory-control/scripts/backup-db.sh

# Check permissions
ls -la /opt/Inventory-control/scripts/backup-db.sh
chmod +x /opt/Inventory-control/scripts/backup-db.sh
```

### Backup File Corrupted

```bash
# Verify archive
gzip -t /opt/Inventory-control/backups/retail_ims_2026-06-13_02-00-00.sql.gz

# If corrupted, restore from previous day
ls -lh /opt/Inventory-control/backups/
gunzip < /opt/Inventory-control/backups/retail_ims_2026-06-12_02-00-00.sql.gz | \
  psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims
```

### Restore Fails with "Connection refused"

```bash
# Check PostgreSQL is running
systemctl status postgresql

# Start PostgreSQL
systemctl start postgresql

# Verify connection
psql -h 127.0.0.1 -p 5433 -U retail -d postgres -c "SELECT 1"
```

### Restore Fails with "Database is being accessed"

```bash
# Stop application
pm2 stop all

# Terminate other connections
psql -h 127.0.0.1 -p 5433 -U postgres -d postgres << EOF
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'retail_ims' 
AND pid <> pg_backend_pid();
EOF

# Try restore again
```

### Out of Disk Space

```bash
# Check usage
df -h
du -sh /opt/Inventory-control/backups

# Emergency cleanup (keep last 3 days only)
find /opt/Inventory-control/backups -name "*.sql.gz" -mtime +3 -delete

# Or reduce retention period in script
sed -i 's/RETENTION_DAYS=7/RETENTION_DAYS=3/' /opt/Inventory-control/scripts/backup-db.sh
```

---

## Security Best Practices

### 1. Restrict Backup Access

```bash
# Only root and postgres should access backups
chmod 700 /opt/Inventory-control/backups
ls -ld /opt/Inventory-control/backups
```

### 2. Secure Database Password

**Option A: Use .pgpass file (recommended)**

```bash
# As root, create /root/.pgpass
echo "127.0.0.1:5433:retail_ims:retail:retail" > /root/.pgpass
chmod 600 /root/.pgpass

# Update backup script to NOT include password
DB_PASSWORD=""  # psql will read from .pgpass
```

**Option B: Environment variable (less secure)**

```bash
# In crontab
0 2 * * * DB_PASSWORD="secure_pass" /opt/Inventory-control/scripts/backup-db.sh
```

### 3. Audit Backup Access

```bash
# Log all backup access
auditctl -w /opt/Inventory-control/backups/ -p wa -k backup-access
```

### 4. Encrypt Backups (Optional)

```bash
# Encrypt backup with GPG
pg_dump ... | gzip | gpg --encrypt -r admin@example.com > backup.sql.gz.gpg

# Decrypt when needed
gpg --decrypt backup.sql.gz.gpg | gunzip | psql ...
```

---

## Compliance & Auditing

### Retention Policy Compliance

```bash
# Verify 7-day retention is enforced
grep "RETENTION_DAYS=" /opt/Inventory-control/scripts/backup-db.sh

# Check backup dates
ls -lh /opt/Inventory-control/backups/ | awk '{print $6, $7, $8, $9}'

# Audit log of backups
tail -100 /opt/Inventory-control/backups/backup.log | grep "Backup complete"
```

### Backup Inventory

Generate monthly backup report:

```bash
#!/bin/bash
echo "=== Backup Report for $(date +%Y-%m) ==="
echo ""
echo "Backup Location: /opt/Inventory-control/backups/"
echo "Retention Period: 7 days"
echo ""
echo "Available Backups:"
ls -lh /opt/Inventory-control/backups/*.sql.gz | \
  awk '{printf "%-50s %8s %s %s %s\n", $9, $5, $6, $7, $8}'
echo ""
echo "Total Backup Size:"
du -sh /opt/Inventory-control/backups
echo ""
echo "Recent Backup Logs:"
tail -10 /opt/Inventory-control/backups/backup.log
```

---

## Upgrade & Maintenance

### Update Backup Script

If backup script is updated in code, redeploy:

```bash
cd /opt/Inventory-control
git pull origin main
chmod +x scripts/backup-db.sh scripts/restore-test.sh
```

### PostgreSQL Version Upgrade

Before upgrading PostgreSQL:

```bash
# 1. Test backup on new version
./scripts/restore-test.sh

# 2. Backup before upgrade
./scripts/backup-db.sh

# 3. Perform upgrade (follow PostgreSQL docs)

# 4. Test restore after upgrade
./scripts/restore-test.sh
```

### Change Database Credentials

If you change database password:

```bash
# Update .pgpass
echo "127.0.0.1:5433:retail_ims:retail:new_password" > /root/.pgpass
chmod 600 /root/.pgpass

# Or update backup script
sed -i 's/DB_PASSWORD="retail"/DB_PASSWORD="new_password"/' /opt/Inventory-control/scripts/backup-db.sh

# Test
/opt/Inventory-control/scripts/backup-db.sh
```

---

## Quick Reference

```bash
# Run backup manually
/opt/Inventory-control/scripts/backup-db.sh

# Test latest backup
/opt/Inventory-control/scripts/restore-test.sh

# View backup log
tail -50 /opt/Inventory-control/backups/backup.log

# List backups
ls -lh /opt/Inventory-control/backups/

# Check disk usage
du -sh /opt/Inventory-control/backups

# Check cron schedule
crontab -l

# Restore specific backup
gunzip < /opt/Inventory-control/backups/retail_ims_2026-06-13_02-00-00.sql.gz | \
  psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-13  
**For Technical Support:** Contact your DevOps team
