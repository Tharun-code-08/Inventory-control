# PostgreSQL backup deploy bundle

Install on the VPS with:

```bash
sudo bash deploy/postgres/scripts/pg-install-backups.sh
```

Full setup, retention policy, and disaster recovery: [docs/postgres-backup-recovery.md](../../docs/postgres-backup-recovery.md)

## Layout

```
deploy/postgres/
  env.example              # Copy to /etc/retail-ims/postgres-backup.env
  postgresql.conf.snippet  # WAL archiving settings
  pg_hba.conf.snippet      # Local replication for pg_basebackup
  scripts/
    pg-full-backup.sh      # Daily physical + logical backup
    pg-wal-sync.sh         # Hourly offsite WAL sync
    pg-prune-backups.sh    # Retention cleanup
    pg-verify-backup.sh    # Health check / alert hook
    pg-restore-full.sh     # Logical restore
    pg-restore-pitr.sh     # Point-in-time recovery
    pg-install-backups.sh  # VPS installer
  systemd/                 # Timer units for automation
```
