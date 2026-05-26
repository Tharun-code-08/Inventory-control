# PostgreSQL backup deploy bundle

Install on the VPS from the **repo root** (e.g. `/opt/Inventory-control`):

**Docker PostgreSQL** (containerized DB):

```bash
cd /opt/Inventory-control
sudo bash deploy/postgres/scripts/pg-docker-install-backups.sh
```

**Hosted PostgreSQL** (system `postgres` service):

```bash
cd /opt/Inventory-control
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
    pg-install-backups.sh  # VPS installer (hosted Postgres)
    pg-docker-*.sh           # Docker Postgres backups + pg-docker-install-backups.sh
    lib-docker.sh            # Shared helpers for Docker scripts
  systemd/                 # Timer units for automation
```
