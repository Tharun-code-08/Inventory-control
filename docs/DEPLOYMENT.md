# Production Deployment

## Production layout

| Component | Production value |
|---|---|
| Checkout | `/opt/Inventory-control-prod` |
| Deploy script | `scripts/deploy.sh prod` |
| PM2 process | `retail-ims-prod` |
| API port | `3001` |
| Liveness | `http://127.0.0.1:3001/api/v1/health` |
| Readiness | `http://127.0.0.1:3001/api/v1/health/ready` |
| PostgreSQL | Docker container, host port `5433` |
| Redis | `127.0.0.1:6379` |

Staging uses a separate checkout, PM2 process, and API port. Do not copy
staging commands into production procedures.

## Automated deployment

The `Deploy to Production` workflow runs only after the CI Quality Gate succeeds
for a push to this repository's `main` branch. It deploys that exact commit,
runs `scripts/deploy.sh prod`, applies Prisma migrations, restarts PM2, and
verifies local health, readiness, deployed commit identity, and (when
configured) the public HTTPS endpoint.

The deployment script rolls code and builds back if a deploy fails. Database
migrations are not rolled back; migrations must be backward compatible.

## GitHub Actions configuration

Configure these values under **Settings → Secrets and variables → Actions**.
Production-scoped secrets belong to the `production` environment.

| Secret / variable | Purpose |
|---|---|
| `DEPLOY_KEY` | Private SSH key used by GitHub Actions to connect to the VPS. |
| `DEPLOY_HOST` | VPS hostname or IP address. |
| `DEPLOY_USER` | SSH account used for deployment. |
| `DEPLOY_HOST_KNOWN_KEY` | Pinned `known_hosts` entry for the VPS. Required; there is no trust-on-first-use fallback. |
| `PRODUCTION_URL` (variable) | Public HTTPS base URL for post-deploy verification. |

The public half of `DEPLOY_KEY` must be authorized for `DEPLOY_USER` on the
VPS. Keep VPS-to-GitHub repository access separate from the GitHub Actions
SSH key. Never print, copy into documentation, or reuse a private key as a
public-key setup step.

### Pin the VPS host key

Obtain the VPS host-key fingerprint from the VPS provider console or another
trusted administrative channel. From a trusted machine, collect the matching
key for the deployment hostname:

```bash
ssh-keyscan -H -t ed25519 <deploy-host>
```

Compare the returned key fingerprint with the trusted provider fingerprint
before saving the full `known_hosts` line as `DEPLOY_HOST_KNOWN_KEY`. Do not
trust `ssh-keyscan` output without that independent comparison. If the VPS
host key changes, verify the rotation out of band before updating the secret.

Deployments intentionally fail before connecting when the host-key secret is
missing. Add and verify it before expecting a production deploy to pass.

## Verify production

On the VPS:

```bash
cd /opt/Inventory-control-prod
pm2 status
pm2 describe retail-ims-prod
curl -fsS http://127.0.0.1:3001/api/v1/health
curl -fsS http://127.0.0.1:3001/api/v1/health/ready
nginx -t
```

The health endpoint should return `status: "ok"` and readiness should return
`database: "connected"`. Check the public URL and deployed commit in the
workflow's post-deployment verification step.

## Troubleshooting and rollback

1. Read the failed GitHub Actions step and `pm2 logs retail-ims-prod --lines 100`.
2. Check local health and readiness before restarting or changing services.
3. The deploy script automatically restores the prior code and built assets
   when its deploy steps fail. Confirm health after the rollback.
4. Do not run `git reset --hard` manually on production or attempt to undo an
   applied migration without a reviewed recovery plan.
5. If the database migration failed or is incompatible, stop further deploys,
   take a database backup, and follow the database recovery guide with the
   database owner.

Never test rollback by pushing intentionally broken code to production. Test
deployment and migration behavior in staging or CI.
