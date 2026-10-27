# Database Backup and Recovery

## Backup behavior

[`scripts/backup-db.sh`](../scripts/backup-db.sh) dumps the `retail_ims`
PostgreSQL database, compresses it, checks the gzip archive, and removes dumps
older than seven days. The defaults are database user `retail`, host
`127.0.0.1`, port `5433`, and backup directory
`/opt/Inventory-control/backups`. `BACKUP_DIR`, `DB_USER`, `DB_HOST`, and
`DB_PORT` can be set by the scheduled job.

The script does not use a built-in database password. Provide credentials
through a protected PostgreSQL password file (`~/.pgpass`, mode `0600`) or a
secret injected as `DB_PASSWORD`. Never commit credentials or put them in
shell commands, cron output, or logs. The `retail` password in the local
Docker Compose file is for local development only and must not be used as a
production credential.

## Check backup status

First inspect the active schedule and configured path; do not assume an old
checkout path:

```bash
crontab -l
grep -R "backup-db.sh\\|BACKUP_DIR" /etc/cron.d /etc/cron.daily 2>/dev/null
```

Then inspect the resolved backup directory and log. The script's default
directory is `/opt/Inventory-control/backups` unless `BACKUP_DIR` overrides
it:

```bash
ls -lh /opt/Inventory-control/backups
tail -50 /opt/Inventory-control/backups/backup.log
```

The script retains by age (seven days), not by file count. Do not manually
delete dumps based on an assumed “last N files” policy. Store off-server
copies as required by the organization's recovery objectives.

## Test a backup

After confirming the backup path and database access, run the restore test
against the latest dump:

```bash
cd /opt/Inventory-control-prod
BACKUP_DIR=/opt/Inventory-control/backups ./scripts/restore-test.sh
```

The test creates and later drops the dedicated `retail_ims_restore_test`
database. Run it only when the database role can create/drop that database and
the target is the intended production PostgreSQL instance. The database
credential must be available through `.pgpass` or an approved secret
injection mechanism.

## Restore production data

Restoring over `retail_ims` is destructive. Obtain explicit approval, notify
users, pause deployments, confirm the selected dump, and capture a fresh
pre-restore dump before proceeding. Coordinate with the database owner. Do
not use the test database for this procedure.

With the approved backup path and PostgreSQL credentials configured:

```bash
pm2 stop retail-ims-prod
BACKUP_DIR=/opt/Inventory-control/backups \
  /opt/Inventory-control-prod/scripts/backup-db.sh
PRE_RESTORE_DUMP=$(find /opt/Inventory-control/backups -name 'retail_ims_*.sql.gz' \
  -type f -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)
gzip -t "$PRE_RESTORE_DUMP"
printf 'Pre-restore backup: %s\n' "$PRE_RESTORE_DUMP"
```

Only continue after confirming the role can create/drop databases and the host
and port point to the intended production instance. A plain SQL dump cannot be
restored over an existing populated database; the target must be recreated:

```bash
dropdb --maintenance-db=postgres -h 127.0.0.1 -p 5433 -U retail retail_ims
createdb -h 127.0.0.1 -p 5433 -U retail -O retail retail_ims
gzip -dc /path/to/approved/retail_ims_backup.sql.gz \
  | psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5433 -U retail -d retail_ims
```

Check the `psql` exit code and application-specific data before restarting.
If the role lacks permission to create/drop the database, stop and have the
database owner perform the restore with their reviewed procedure.

```bash
pm2 start retail-ims-prod
curl -fsS http://127.0.0.1:3001/api/v1/health
curl -fsS http://127.0.0.1:3001/api/v1/health/ready
```

If the restore fails or readiness does not report a connected database, stop
and contact the database owner. Do not repeatedly replay a partial dump.
