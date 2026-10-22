# PM2 process files

| File | Process | Notes |
| --- | --- | --- |
| `production.config.js` | `retail-ims-prod` on `:3001` in `/opt/Inventory-control-prod` | The deploy pipeline restarts this process by name; use the file only to (re)create it: `pm2 start deploy/pm2/production.config.js && pm2 save` |
| `staging.config.js` | `staging-api` | Secrets come from `STAGING_*` environment variables. Check its `cwd`, port and Redis port against the staging host before use; [the staging runbook](../../docs/workflow-engine/STAGING-RUNBOOK.md) describes that host |

Runtime configuration (database, secrets, mail) is read by the API from `apps/api/.env`.
