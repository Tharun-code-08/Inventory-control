# Backup Administration

## What the repository scripts do

- [`scripts/backup-db.sh`](../scripts/backup-db.sh) creates a compressed dump
  of `retail_ims`, verifies the gzip stream, and removes dumps older than seven
  days.
- [`scripts/restore-test.sh`](../scripts/restore-test.sh) restores a dump into
  the dedicated `retail_ims_restore_test` database, runs basic validation
  queries, and removes the test database on exit.

The scripts default to PostgreSQL on `127.0.0.1:5433`, database user `retail`,
and `/opt/Inventory-control/backups`. A scheduled job may set `DB_HOST`,
`DB_PORT`, `DB_USER`, and `BACKUP_DIR`; inspect the active cron configuration
before assuming those values.

## Credentials and file permissions

The scripts have no default password. Use a PostgreSQL password file with
permissions `0600` or inject `DB_PASSWORD` from the approved secret store.
Avoid placing secrets directly in crontab, command history, logs, or repository
files. Set permissions on backup files and directories so application data is
readable only by the backup operator (`umask 077` is applied by the scripts).

The `retail` password in `docker/docker-compose.yml` is only a local
development default. Do not copy it into production.

## Schedule and verify

Inspect the current schedule and backup location:

```bash
crontab -l
grep -R "backup-db.sh\\|BACKUP_DIR" /etc/cron.d /etc/cron.daily 2>/dev/null
```

For the default directory:

```bash
ls -lh /opt/Inventory-control/backups
tail -50 /opt/Inventory-control/backups/backup.log
```

Run a restore test only after confirming the path, credential source, target
database, and permission to create/drop the test database:

```bash
cd /opt/Inventory-control-prod
BACKUP_DIR=/opt/Inventory-control/backups ./scripts/restore-test.sh
```

See the [backup and recovery guide](./BACKUP-RECOVERY-GUIDE.md) for
production restore safety and verification. Never delete backups by file
count: the script's policy is seven days by age.
