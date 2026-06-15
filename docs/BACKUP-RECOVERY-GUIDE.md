# Database Backup & Recovery Guide

**For: Retail Inventory Management System (IMS) Clients**

---

## Overview

Your Retail IMS includes an automated backup system that creates daily snapshots of your entire database. In case of data loss, corruption, or system failure, you can recover your complete system state from any backup.

**Key Facts:**
- ✅ Automatic daily backups at 2:00 AM (server timezone)
- ✅ Compressed format (typically 100-150 KB per backup)
- ✅ 7-day retention (oldest backups auto-deleted)
- ✅ Verified for integrity before retention
- ✅ Full database recovery in < 2 minutes

---

## Part 1: How Backups Work

### What Gets Backed Up

Complete backup includes:
- All users and authentication data
- All companies and organizational structure
- All products and inventory records
- All transactions (goods receipts, issues, transfers)
- Complete audit trail (who changed what, when)
- All system configurations
- Database schema (tables, indexes, constraints)

### When & How Often

| Frequency | Time | Size | Duration |
|-----------|------|------|----------|
| Daily | 2:00 AM | ~136 KB | ~1 second |
| Retention | Last 7 days | ~1 MB total | Auto-cleanup |

### Storage Location

```
/opt/Inventory-control/backups/
├── retail_ims_2026-06-13_02-00-00.sql.gz
├── retail_ims_2026-06-12_02-00-00.sql.gz
├── retail_ims_2026-06-11_02-00-00.sql.gz
└── backup.log
```

**Access:** Log into your server via SSH, navigate to `/opt/Inventory-control/backups/`

---

## Part 2: Recovery Procedure

### When to Use Recovery

Use this procedure if:
- Database is corrupted
- Accidental data deletion
- Server migration
- System restore after hardware failure
- Compliance/audit verification needed

### Prerequisites

- SSH access to server (username/password or key)
- PostgreSQL command-line tools installed
- ~5 minutes of downtime (or use staging server first)

### Step 1: Connect to Server

```bash
ssh root@your-server-ip
cd /opt/Inventory-control
```

**Example:**
```bash
ssh root@192.168.1.100
cd /opt/Inventory-control
```

### Step 2: List Available Backups

```bash
ls -lh backups/
```

**Output example:**
```
-rw-r--r-- 1 root root 136K Jun 13 02:00 retail_ims_2026-06-13_02-00-00.sql.gz
-rw-r--r-- 1 root root 135K Jun 12 02:00 retail_ims_2026-06-12_02-00-00.sql.gz
-rw-r--r-- 1 root root 134K Jun 11 02:00 retail_ims_2026-06-11_02-00-00.sql.gz
```

**Choose the most recent backup** unless you need a specific date.

### Step 3: Test Recovery (RECOMMENDED)

**Always test on a temporary database first.** This proves the backup is usable without touching production.

```bash
# Run the automated test
./scripts/restore-test.sh

# Or specify a backup file
./scripts/restore-test.sh backups/retail_ims_2026-06-13_02-00-00.sql.gz
```

**Expected output:**
```
=== RESTORE TEST STARTED ===
Creating test database...
Test database created
Restoring backup...
Restore complete (1s)
=== VALIDATION QUERIES ===
Query: SELECT COUNT(*) as user_count FROM users;
Result: 8

Query: SELECT COUNT(*) as company_count FROM companies;
Result: 6

[... more validation ...]

=== RESTORE TEST SUCCESSFUL ===
Backup is valid and recoverable
Cleaning up test database...
Test database dropped
```

If test passes → backup is good → proceed to Step 4.  
If test fails → backup may be corrupted → try an earlier backup.

### Step 4: Stop the Application (Production Only)

To avoid corruption, stop the application before recovery:

```bash
pm2 stop all
pm2 list
```

Verify all processes are stopped (status should show "stopped").

### Step 5: Backup Current Database (Safety)

Before overwriting, save the current state:

```bash
pg_dump \
  -h 127.0.0.1 \
  -p 5433 \
  -U retail \
  -d retail_ims \
  | gzip > backups/pre-recovery-$(date +%Y-%m-%d_%H-%M-%S).sql.gz

ls -lh backups/ | head -5
```

This preserves the current (possibly corrupted) database in case you need to analyze it later.

### Step 6: Restore from Backup

```bash
# Set database password
export PGPASSWORD="retail"

# Restore from backup
gunzip < backups/retail_ims_2026-06-13_02-00-00.sql.gz | \
  psql \
    -h 127.0.0.1 \
    -p 5433 \
    -U retail \
    -d retail_ims

# Verify restore completed
echo "Restore complete. Exit code: $?"
```

**What you'll see:**
- Progress messages (CREATE TABLE, INSERT, etc.)
- Takes 1-2 minutes
- Final message: "Restore complete. Exit code: 0" (0 = success)

### Step 7: Verify Data Integrity

Run these SQL checks to confirm everything is restored:

```bash
psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims << EOF
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_companies FROM companies;
SELECT COUNT(*) as total_products FROM products;
SELECT COUNT(*) as total_audit_logs FROM audit_logs;
SELECT COUNT(*) as total_migrations FROM _prisma_migrations;
SELECT action, COUNT(*) FROM audit_logs GROUP BY action;
SELECT action, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 5;
EOF
```

**Expected output:** Numbers should match your last known good state.

### Step 8: Restart Application

```bash
pm2 start all
pm2 log
```

Wait 10-15 seconds for the application to fully start. Check logs for errors.

### Step 9: Verification Checklist

- [ ] Can you log in to the web application?
- [ ] Can you view your products?
- [ ] Can you see your company data?
- [ ] Can you access audit logs?
- [ ] Health endpoint returns 200: `curl http://localhost:3000/health`

---

## Part 3: Automated Testing

### Test Your Backup Weekly

We provide a script to test restorability without affecting production:

```bash
# From any terminal on the server
cd /opt/Inventory-control
./scripts/restore-test.sh
```

This script:
1. Creates a temporary test database
2. Restores from the latest backup
3. Validates all tables exist and have data
4. Runs 7 verification queries
5. Automatically cleans up (no manual cleanup needed)
6. Exits with code 0 (success) or 1 (failure)

**Recommended:** Run this test weekly, or after any major changes.

---

## Part 4: Troubleshooting

### Problem: "Backup file not found"

**Cause:** Wrong filename or path  
**Solution:** 
```bash
ls -lh /opt/Inventory-control/backups/
# Copy exact filename from output
```

### Problem: "Connection refused" on psql

**Cause:** Database service not running  
**Solution:**
```bash
# Check if PostgreSQL is running
systemctl status postgresql
systemctl status postgres

# Or check if port 5433 is listening
netstat -tlnp | grep 5433
```

### Problem: "Permission denied" on scripts

**Cause:** Script not executable  
**Solution:**
```bash
chmod +x /opt/Inventory-control/scripts/backup-db.sh
chmod +x /opt/Inventory-control/scripts/restore-test.sh
```

### Problem: "Role 'retail' does not exist"

**Cause:** PostgreSQL user not configured  
**Solution:** Create user if missing:
```bash
sudo -u postgres psql << EOF
CREATE ROLE retail WITH PASSWORD 'retail' LOGIN;
ALTER ROLE retail SUPERUSER;
EOF
```

### Problem: Restore appears stuck

**Cause:** Large backup (should be quick, but depends on server)  
**Solution:** Wait up to 5 minutes. If still stuck, kill and try again:
```bash
# In another terminal
ps aux | grep psql
kill -9 <PID>

# Check database state
psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims -c "SELECT 1"
```

### Problem: "Database is being accessed by other users"

**Cause:** Application or other connections using database  
**Solution:** 
```bash
# Stop application first
pm2 stop all

# Terminate other connections
psql -h 127.0.0.1 -p 5433 -U retail -d postgres << EOF
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'retail_ims'
  AND pid <> pg_backend_pid();
EOF

# Then restore
gunzip < backups/retail_ims_2026-06-13_02-00-00.sql.gz | \
  psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims
```

---

## Part 5: Disaster Recovery Checklist

### For Total Data Loss

```
☐ Step 1: Verify backups exist
  ls -lh /opt/Inventory-control/backups/

☐ Step 2: Test restore on staging server (if available)
  ./scripts/restore-test.sh

☐ Step 3: Connect to production server
  ssh root@your-server-ip
  cd /opt/Inventory-control

☐ Step 4: Stop application
  pm2 stop all

☐ Step 5: Backup current state (even if corrupted)
  pg_dump ... | gzip > backups/pre-recovery-$(date +%s).sql.gz

☐ Step 6: Restore from backup
  gunzip < backups/retail_ims_2026-06-13_02-00-00.sql.gz | psql ...

☐ Step 7: Verify data integrity
  psql ... -c "SELECT COUNT(*) FROM users;"

☐ Step 8: Restart application
  pm2 start all

☐ Step 9: Test via web browser
  Log in, view data, verify functionality

☐ Step 10: Document incident
  When it happened, what was lost, when restored, any data gaps
```

---

## Part 6: Important Policies

### Backup Retention

| Retention Period | Backups Kept |
|------------------|--------------|
| 7 days | All backups from past week |
| 8+ days | Auto-deleted |

**Example:** June 13 backup exists until June 20 11:59 PM, then deleted on June 21.

### Testing Frequency

- **Minimum:** Test backup monthly
- **Recommended:** Test weekly
- **Best Practice:** After major changes (migrations, schema updates)

### Compliance & Audit

- All backups logged in `/var/log/retail-backup.log`
- Each backup includes timestamp and file size
- Audit logs show all database changes (who, when, what)
- Recovery is fully reversible (old state saved as pre-recovery backup)

---

## Part 7: Contact & Support

### If Backup Fails

Check the backup log:
```bash
tail -50 /opt/Inventory-control/backups/backup.log
```

Common reasons:
- Disk space full: `df -h`
- Database locked: `pm2 list` and `pm2 logs`
- Network/PostgreSQL down: `netstat -tlnp | grep 5433`

### If Recovery Fails

1. Do NOT restart the application
2. Preserve the current database state:
   ```bash
   pg_dump ... | gzip > debug-backup-$(date +%s).sql.gz
   ```
3. Try restoring from earlier backup:
   ```bash
   ./scripts/restore-test.sh backups/retail_ims_2026-06-12_02-00-00.sql.gz
   ```
4. Contact support with:
   - Backup date/time
   - Error messages from logs
   - Last 50 lines of `/opt/Inventory-control/backups/backup.log`

---

## Quick Reference

### List Backups
```bash
ls -lh /opt/Inventory-control/backups/
```

### Test Latest Backup
```bash
/opt/Inventory-control/scripts/restore-test.sh
```

### Restore Specific Backup
```bash
cd /opt/Inventory-control
export PGPASSWORD="retail"
gunzip < backups/retail_ims_2026-06-13_02-00-00.sql.gz | \
  psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims
```

### Check Backup Status
```bash
tail -20 /opt/Inventory-control/backups/backup.log
```

### Emergency Restart
```bash
pm2 restart all
pm2 log
```

---

## Summary

Your Retail IMS has **automated, daily, tested backups**. In the event of any data loss:

1. **Stop** the application
2. **Test** the backup (2 minutes)
3. **Restore** from backup (1-2 minutes)
4. **Verify** data integrity (1 minute)
5. **Restart** application

**Total recovery time: ~5 minutes**

Your data is protected. Backups are verified daily. Recovery is proven and reversible.

---

**Last Updated:** 2026-06-13  
**Backup System Version:** 1.0  
**For questions:** Contact your system administrator
