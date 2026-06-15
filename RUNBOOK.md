# Operational Runbook

**For: On-call engineers, DevOps, emergency response**

---

## Emergency Contacts

| Role | Contact | Escalation |
|------|---------|-----------|
| Primary On-Call | [Name] | [Phone] |
| Secondary On-Call | [Name] | [Phone] |
| Database Admin | [Name] | [Phone] |
| Network Admin | [Name] | [Phone] |

---

## Health Check (Do This First)

```bash
ssh root@your-server-ip
cd /opt/Inventory-control

# 1. Is the app running?
pm2 list
# Should show: 'api' with status 'online'

# 2. Is the database responding?
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"...","requestId":"..."}

# 3. Can you login?
# Open browser: https://your-domain/login
# Try login with test credentials
```

**If all three pass:** System is healthy. Investigate specific issue.

**If any fail:** Follow the "What's Wrong" section below.

---

## What's Wrong? Diagnosis Tree

### Symptom: API Not Responding

```bash
# 1. Is process running?
pm2 list
# ├─ api online → process running
# └─ api stopped → RESTART (see "Restart API" below)

# 2. Is it listening?
netstat -tlnp | grep 3000
# Should show: tcp ... 0.0.0.0:3000 ... LISTEN

# 3. Check logs
pm2 log api | tail -50
# Look for: errors, connection refused, out of memory

# 4. Check database connection
psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims -c "SELECT 1"
# Should return: 1

# 5. Check disk space
df -h /opt/Inventory-control
# Should show: > 1 GB available
```

### Symptom: Database Not Responding

```bash
# 1. Is PostgreSQL running?
systemctl status postgresql
# Status should be: active (running)

# 2. If not running, start it
systemctl start postgresql

# 3. Can you connect?
psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims -c "SELECT version()"
# Should return: PostgreSQL version info

# 4. If connection refused, check port
netstat -tlnp | grep 5433
# Should show: tcp ... 0.0.0.0:5433 ... LISTEN

# 5. If still failing, restart PostgreSQL
systemctl restart postgresql
sleep 5
psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims -c "SELECT 1"
```

### Symptom: High Memory Usage

```bash
# 1. Check memory
free -h
# Look for: Mem line

# 2. Check which process is using it
ps aux | head -20
# Look for process with high %MEM

# 3. If API is memory hog
pm2 restart api

# 4. If still high, check logs
pm2 log api | tail -100
# Look for: memory leak patterns
```

### Symptom: Disk Space Full

```bash
# 1. Check disk usage
df -h

# 2. Find large files
du -sh /opt/Inventory-control/*
du -sh /var/log/*

# 3. If backups are large
du -sh /opt/Inventory-control/backups
# Delete old backups (keep last 3):
find /opt/Inventory-control/backups -name "*.sql.gz" -mtime +3 -delete

# 4. If logs are large
du -sh /var/log
tail -100 /var/log/syslog > /tmp/syslog-backup
truncate -s 0 /var/log/syslog
```

---

## Common Procedures

### Restart API

```bash
cd /opt/Inventory-control

# Graceful restart (preferred)
pm2 restart api
pm2 log api

# Full restart (if graceful fails)
pm2 stop api
sleep 3
pm2 start api
pm2 log api

# Wait for startup
# App should be ready in 5-10 seconds
curl http://localhost:3000/health
```

### Restart Database

```bash
# Stop app first
pm2 stop api

# Restart PostgreSQL
systemctl restart postgresql
sleep 5

# Verify it's running
systemctl status postgresql

# Start app
pm2 start api
pm2 log api
```

### Full System Restart

```bash
# 1. Shutdown gracefully
pm2 stop all
pm2 save

# 2. Restart PostgreSQL
systemctl restart postgresql
sleep 5

# 3. Restart application
pm2 start all
pm2 log

# 4. Verify health
sleep 10
curl http://localhost:3000/health
```

### Deploy New Code

```bash
cd /opt/Inventory-control

# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Run migrations (if needed)
npx prisma migrate deploy

# 5. Restart
pm2 restart api
pm2 log api

# 6. Verify health
sleep 10
curl http://localhost:3000/health
```

### Rollback Code

```bash
cd /opt/Inventory-control

# 1. See recent commits
git log --oneline | head -10

# 2. Rollback to previous commit
git reset --hard HEAD~1

# 3. Build and restart
npm run build
pm2 restart api
pm2 log api

# Verify
curl http://localhost:3000/health
```

### Restore from Backup

**DO NOT DO THIS WITHOUT CONFIRMING WITH TEAM FIRST**

```bash
cd /opt/Inventory-control

# 1. Stop application
pm2 stop api

# 2. List backups
ls -lh backups/*.sql.gz

# 3. Test restore (creates temp database)
./scripts/restore-test.sh backups/retail_ims_2026-06-13_02-00-00.sql.gz
# If successful, exit code is 0

# 4. Backup current database (just in case)
export PGPASSWORD="retail"
pg_dump -h 127.0.0.1 -p 5433 -U retail -d retail_ims | \
  gzip > backups/pre-recovery-$(date +%s).sql.gz

# 5. Restore from backup
gunzip < backups/retail_ims_2026-06-13_02-00-00.sql.gz | \
  psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims

# 6. Verify data
psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims -c \
  "SELECT COUNT(*) FROM audit_logs; SELECT COUNT(*) FROM products;"

# 7. Restart application
pm2 start api
pm2 log api
```

---

## Monitoring Checklist (Daily)

```bash
# 1. Check backup ran
ls -lh /opt/Inventory-control/backups/ | head -5
# Should see today's date on latest file

# 2. Check backup log
tail -10 /opt/Inventory-control/backups/backup.log
# Should show "=== Backup complete ===" from today

# 3. Check application is running
pm2 list | grep api
# Should show: api online (1)

# 4. Check health endpoint
curl http://localhost:3000/health
# Should return: 200 OK

# 5. Check disk space
df -h /opt/Inventory-control
# Should have: > 1 GB available

# 6. Check recent errors
pm2 log api --lines 50 | tail -20
# Should not see: ERROR, exception, crash
```

---

## Incident Response

### User Reports Can't Login

```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Check auth service logs
pm2 log api | grep -i "auth" | tail -20

# 3. Check database
psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims \
  -c "SELECT COUNT(*) FROM users;"

# 4. Try login as admin
# If it works: isolated issue
# If it fails: system-wide auth issue

# 5. Check rate limiting
# Users locked out after 5 failed attempts?
# Wait 15 minutes or contact support
```

### User Reports Missing Data

```bash
# 1. Verify in database
psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims << EOF
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM audit_logs;
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;
EOF

# 2. Check audit trail
# Find what happened to the data
psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims << EOF
SELECT action, created_at, user_id FROM audit_logs
WHERE entity_type = 'product'
ORDER BY created_at DESC LIMIT 20;
EOF

# 3. Determine if accidental deletion or bug
# Check audit_logs action column for DELETE

# 4. If recent deletion:
# Restore from backup (see "Restore from Backup" above)

# 5. If data was never there:
# Data entry issue, not system issue
```

### User Reports Slow Performance

```bash
# 1. Check system resources
free -h  # Memory
df -h    # Disk
top -b -n 1 | head -20  # CPU

# 2. Check database connection pool
# Look at PM2 logs for "ECONNREFUSED"
pm2 log api | tail -50

# 3. Check slow queries
psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims << EOF
SELECT query, calls, mean_time FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;
EOF

# 4. If memory high: restart API
pm2 restart api

# 5. If database slow: restart PostgreSQL
systemctl restart postgresql
```

### Backup Failed

```bash
# 1. Check backup log
tail -50 /opt/Inventory-control/backups/backup.log

# 2. Check common issues
# Is PostgreSQL running?
systemctl status postgresql

# Is disk full?
df -h /opt/Inventory-control

# Can connect to database?
psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims -c "SELECT 1"

# 3. Run backup manually
/opt/Inventory-control/scripts/backup-db.sh

# 4. If still failing, check cron
crontab -l | grep backup-db

# 5. Test restore
/opt/Inventory-control/scripts/restore-test.sh
```

---

## Critical Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Disk Free | < 500 MB | < 100 MB |
| Memory Free | < 256 MB | < 64 MB |
| API Response Time | > 1s | > 5s |
| Database Connections | > 80 | > 95 |
| Backup Age | > 24h | > 48h |
| Backup Size | > 500 KB | > 1 MB |

---

## Escalation Path

**Level 1: Can restart**
- API/database restart fails
- Disk space cleanup
- Deploy new code

**Level 2: Must restore**
- Data corruption
- Database won't start
- Accidental deletion

**Level 3: Infrastructure**
- Network issues
- Hardware failure
- Server down

---

## Useful Commands

```bash
# System status
pm2 list                          # Show all processes
pm2 logs                          # Tail all logs
pm2 monit                         # Watch CPU/memory
df -h                            # Disk usage
free -h                          # Memory usage
uptime                           # Server uptime

# Database
psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims -c "SELECT 1"
pg_stat_replication              # Replication status (if applicable)

# Backup
ls -lh /opt/Inventory-control/backups/
tail -50 /opt/Inventory-control/backups/backup.log
./scripts/restore-test.sh        # Test latest backup

# Application
curl http://localhost:3000/health
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
```

---

## During an Incident

1. **Stay calm.** Most issues are recoverable.
2. **Check health first.** API? Database? Both?
3. **Don't guess.** Follow diagnosis tree above.
4. **Document.** What happened? When? What fixed it?
5. **Notify.** Slack, email, or team lead depending on severity.
6. **Verify.** Health check again after any fix.
7. **Escalate early** if unsure. It's better to involve someone than to guess wrong.

---

## Post-Incident

After any incident:

1. Check backup from that day
   ```bash
   ls -lh /opt/Inventory-control/backups/ | grep "$(date +%Y-%m-%d)"
   ```

2. Review logs
   ```bash
   tail -200 /opt/Inventory-control/backups/backup.log
   pm2 log api | head -200
   ```

3. Document in incident log
   ```
   Date: 2026-06-13 14:30
   Issue: Database connection refused
   Duration: 5 minutes
   Root Cause: PostgreSQL process crashed
   Fix: Restarted PostgreSQL
   Prevention: Monitor process restarts
   ```

4. Test backup & restore
   ```bash
   /opt/Inventory-control/scripts/restore-test.sh
   ```

---

## References

- **Backup Procedure:** [docs/BACKUP-RECOVERY-GUIDE.md](docs/BACKUP-RECOVERY-GUIDE.md)
- **Admin Details:** [docs/BACKUP-ADMINISTRATION.md](docs/BACKUP-ADMINISTRATION.md)
- **API Health:** `/health`, `/health/live`, `/health/ready`
- **Logs:** `pm2 log`, `/opt/Inventory-control/backups/backup.log`

---

**Keep this open during on-call rotations.**

**Last Updated:** 2026-06-13

**Version:** 1.0
