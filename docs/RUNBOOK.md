# Production Operations Runbook

## Production inventory

| Component | Value |
|---|---|
| Application checkout | `/opt/Inventory-control-prod` |
| API process | PM2 `retail-ims-prod` |
| API port | `3001` |
| PostgreSQL | Docker, host port `5433` |
| Redis | `127.0.0.1:6379` |
| Nginx | Public HTTP/HTTPS proxy |

Use the deployment-specific names and paths above. Older instructions for
`/opt/Inventory-control`, PM2 process `api`/`retail-api`, and API port `3000`
refer to a previous layout and must not be used for production.

## First response: health and status

Connect to the server using the approved SSH account, then run:

```bash
cd /opt/Inventory-control-prod
date -u
uptime
df -h /
free -h
systemctl is-active nginx
nginx -t
pm2 status
pm2 describe retail-ims-prod
curl -fsS http://127.0.0.1:3001/api/v1/health
curl -fsS http://127.0.0.1:3001/api/v1/health/ready
```

Expected: PM2 shows `retail-ims-prod` online, liveness reports `status:
"ok"`, and readiness reports `database: "connected"`. Check the public site
and API URL as well if local checks succeed but customers still report an
outage.

## API unavailable

```bash
cd /opt/Inventory-control-prod
pm2 status
pm2 logs retail-ims-prod --lines 100
ss -ltnp | grep ':3001'
curl -i --max-time 10 http://127.0.0.1:3001/api/v1/health
curl -i --max-time 10 http://127.0.0.1:3001/api/v1/health/ready
```

Check PM2 logs before restarting. A process marked `online` can still be
restarting or failing before binding its port. If a restart is justified:

```bash
pm2 restart retail-ims-prod --update-env
pm2 status
pm2 logs retail-ims-prod --lines 100
```

Do not delete `node_modules`, generated Prisma files, or deployment state as a
first response. If Prisma Client is missing after an install, stop the restart
loop, run `npm run prisma:generate --workspace=api -- --no-hints` from the
production checkout, then restart and verify both health endpoints.

## Database and Redis

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
redis-cli -h 127.0.0.1 -p 6379 ping
```

The database container should report healthy and Redis should return `PONG`.
Use the configured database credentials from the server's secret-management
process; do not put passwords in shell history, chat, logs, or this runbook.
Avoid restarting PostgreSQL, Redis, or Docker until their logs and impact have
been checked.

## Deployment and rollback

Production deploys are performed by the CI-gated GitHub Actions workflow. Use
the current [deployment guide](./DEPLOYMENT.md) for workflow checks and SSH
host-key configuration. Do not manually pull code, reset the production
checkout, or test with an intentionally broken push.

The deployment script rolls back application code and built assets when its
own health checks fail. It does not roll back Prisma migrations. For migration
or data failures, pause deployments, take a database backup, and coordinate a
reviewed recovery plan with the database owner.

## Backups

The backup script retains database dumps for **7 days**; it does not retain
exactly three files. Find the configured schedule and directory before
troubleshooting or cleaning up:

```bash
crontab -l
grep -R "backup-db.sh\\|BACKUP_DIR" /etc/cron.d /etc/cron.daily 2>/dev/null
grep -n "BACKUP_DIR\\|RETENTION_DAYS" /opt/Inventory-control-prod/scripts/backup-db.sh
```

The script's default backup directory is `/opt/Inventory-control/backups`;
`BACKUP_DIR` can override it. Confirm the configured directory before checking
the latest dump:

```bash
ls -lh /opt/Inventory-control/backups
tail -50 /opt/Inventory-control/backups/backup.log
```

The script validates gzip integrity and removes dumps older than seven days.
Provide database credentials through a mode-`0600` PostgreSQL password file
or the approved `DB_PASSWORD` secret injection. The script has no default
password; the `retail` password in the local Docker Compose file is for local
development only.
Do not manually delete backups to meet an assumed count. Use
`scripts/restore-test.sh` only after confirming the backup path, database
credentials, and that the database role can create and drop the dedicated
`retail_ims_restore_test` database. A live restore is destructive: obtain
explicit approval, capture a current backup, and follow
[the backup and recovery guide](./BACKUP-RECOVERY-GUIDE.md).

## Escalation evidence

When escalating, include UTC time, the affected public URL, output from the
health/readiness checks, PM2 status and recent error logs, disk and memory
availability, and the deployed commit SHA. Redact credentials, tokens,
customer data, and environment-variable values.
