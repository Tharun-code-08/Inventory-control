# Documentation

Start with the [repository README](../README.md) for the product overview, local setup
and everyday commands. Everything else lives here.

## Shipping and operating production

| Guide | Use it for |
| --- | --- |
| [Deployment](DEPLOYMENT.md) | How the GitHub Actions → VPS pipeline works, required secrets, safe migrations |
| [Deployment safety checklist](deployment-safety-checklist.md) | What to check before and after a risky release |
| [Runbook](RUNBOOK.md) | Operating production: health checks, incidents, restarts, recovery |
| [Rollback walkthrough](deploy-rollback-demo.md) | How `scripts/deploy.sh` rolls back, and how to re-verify it |
| [Hardening operations](hardening-operations-runbook.md) | Permission matrix, rate limits and other security operations |

## Backups and recovery

| Guide | Use it for |
| --- | --- |
| [PostgreSQL backup & recovery](postgres-backup-recovery.md) | Nightly backups, WAL archiving, point-in-time restore on the VPS |
| [Backup & recovery guide](BACKUP-RECOVERY-GUIDE.md) | Restoring the database step by step |
| [Backup administration](BACKUP-ADMINISTRATION.md) | Retention, verification timers and storage |
| [deploy/postgres](../deploy/postgres/README.md) | The backup scripts and systemd units themselves |

## Testing

| Guide | Use it for |
| --- | --- |
| [Business workflow testing](business-workflow-testing.md) | Running the API end-to-end workflow suites locally and in CI |

## Workflow engine

Design, rollout and schema-reconciliation records for the workflow and notification
engine. Several migrations link to these files, so they stay at these paths.

| Document | Purpose |
| --- | --- |
| [Staging runbook](workflow-engine/STAGING-RUNBOOK.md) | Deploying the engine to staging |
| [Go-live runbook](workflow-engine/GO-LIVE-RUNBOOK.md) | Production rollout steps |
| [Release readiness](workflow-engine/RELEASE-READINESS.md) | Go/no-go criteria |
| [Pilot issues](workflow-engine/PILOT-ISSUES.md) | Issues found during the pilot |
| [Schema reconciliation analysis](workflow-engine/SCHEMA-RECONCILIATION-ANALYSIS.md) · [C/D decisions](workflow-engine/SCHEMA-RECONCILIATION-CD-DECISIONS.md) · [Staging drift report](workflow-engine/STAGING-SCHEMA-DRIFT-REPORT.md) · [Failed migrations audit](workflow-engine/FAILED-MIGRATIONS-RECONCILIATION.md) | Historical record of how schema drift between environments was resolved |

## Releases

[releases/](releases/README.md) holds per-release plans and retrospectives
(for example [prisma-stock-hardening](releases/prisma-stock-hardening/RELEASE_SUMMARY.md)).
Release notes for every change are in the [changelog](../CHANGELOG.md).

## Project policies

- [Contributing](../CONTRIBUTING.md) — branches, pull requests, migrations
- [Security policy](../SECURITY.md) — reporting vulnerabilities
- [Code of conduct](../CODE_OF_CONDUCT.md)
