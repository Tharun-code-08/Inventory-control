# Deployment Guide

## Architecture

```
Laptop (git push main)
    ↓
GitHub
    ↓
GitHub Actions
    ↓
SSH to VPS (deploy user)
    ↓
/opt/Inventory-control/scripts/deploy.sh
    ├─ Save current commit A
    ├─ git pull (get commit B)
    ├─ npm ci
    ├─ npm run build
    ├─ npx prisma migrate deploy
    ├─ sudo pm2 restart retail-api
    ├─ sleep 3
    └─ curl localhost:3000/api/v1/health
        │
        ├─ If 200 OK
        │   └─ Users use commit B
        │
        └─ If failed
            ├─ git reset --hard A
            ├─ sudo pm2 restart
            └─ Users continue with A
```

## GitHub Secrets (Required)

⚠️ **SECURITY WARNING**
- **Private key** (`deploy_key`) → GitHub Secrets ONLY
- **Never commit** private key to git
- **Public key** (`deploy_key.pub`) → `/home/deploy/.ssh/authorized_keys`
- Verify permissions: `chmod 600 ~/.ssh/deploy_key`

Add these 3 secrets to GitHub:
Repository → Settings → Secrets and variables → Actions

```
Name: DEPLOY_KEY
Value: (Paste ONLY the private key content - cat /home/deploy/.ssh/deploy_key)
       (Then DELETE the local key file after confirming Secret is saved)

Name: DEPLOY_HOST
Value: 187.127.173.9

Name: DEPLOY_USER
Value: deploy
```

Verify setup:
```bash
# Private key should ONLY exist in GitHub Secrets
ls -la /home/deploy/.ssh/deploy_key
# Should NOT exist after setup

# Public key should be in authorized_keys
cat /home/deploy/.ssh/authorized_keys | grep "deploy@inventory-control"
# Should show the ed25519 public key
```

## Pre-Launch Tests (Run These 5)

### Test 1: Empty Deployment
```bash
git commit --allow-empty -m "Test CI/CD"
git push origin main
```
Expected: GitHub Actions ✅ → Health check ✅ → PM2 online ✅

### Test 2: Intentional Build Failure
```bash
# Break the build
echo "const x = unknownVariable;" >> apps/api/src/main.ts
git add .
git commit -m "Intentional build failure"
git push origin main
```
Expected: Build fails → Rollback triggered → Old version still works

Verify users can still log in and use the app.

### Test 3: VPS Reboot
```bash
sudo reboot
# Wait 30 seconds
```
Expected: PM2 auto-starts, health endpoint returns 200

### Test 4: Prisma Migration
Add a safe migration:
```prisma
description String?
```
Deploy and verify:
- Migration runs
- API starts
- Existing data intact

### Test 5: Health Endpoint
```bash
curl http://localhost:3000/api/v1/health
```
Expected: Returns 200 with `"status":"ok"`

---

## Deployment Readiness Checklist

### Before First Push

- [ ] GitHub Secrets added (DEPLOY_KEY, DEPLOY_HOST, DEPLOY_USER)
- [ ] deploy.sh is executable: `ls -lh scripts/deploy.sh`
- [ ] Rollback state directory exists: `ls -ld .deploy`
- [ ] PM2 configured for startup: `ls -l /etc/systemd/system/pm2-root.service`

### Test Deployment (Empty Commit)

```bash
git commit --allow-empty -m "Test CI/CD pipeline"
git push origin main
```

Watch at: https://github.com/Tharun-code-08/Inventory-control/actions

Expected result:
- ✅ GitHub Actions workflow runs
- ✅ Connects via SSH
- ✅ Runs deploy.sh
- ✅ Health check passes
- ✅ Workflow shows "success"

### Verify After Deployment

```bash
# Check PM2
pm2 status

# Check health
curl http://localhost:3000/api/v1/health

# Check logs
pm2 logs retail-api --lines 20
```

### Test Rollback (Optional but Recommended)

1. Make a bad change:
```bash
echo "// broken code" >> apps/api/src/main.ts
git add .
git commit -m "Intentional failure to test rollback"
git push origin main
```

2. Watch deployment fail:
   - GitHub Actions shows ❌
   - PM2 still runs previous version
   - `curl /health` should still work

3. Fix and push again:
```bash
git revert HEAD
git push origin main
```

4. Deployment should succeed again

### Reboot Test

Verify PM2 auto-starts on VPS reboot:

```bash
sudo reboot
# Wait 30 seconds
```

Then check:
```bash
pm2 status
# Should show retail-api online

curl http://localhost:3000/api/v1/health
# Should return 200
```

## Database Migrations

### Important Constraint

Rollback restores **code**, not **database schema**.

Prisma migrations persist even after rollback.

### Safe Migration Pattern

**Never do this:**
```sql
ALTER TABLE users DROP COLUMN email;
```

**Do this instead:**

Step 1: Add new column
```prisma
model User {
  id Int @id
  email String
  email_v2 String? // New column
}
```

Deploy and test.

Step 2: Migrate data
```sql
UPDATE users SET email_v2 = email;
```

Deploy.

Step 3: Update code to use email_v2

Deploy.

Step 4: Remove old column
```prisma
model User {
  id Int @id
  email_v2 String @map("email")
}
```

### Pre-Deployment Checklist for Risky Migrations

- [ ] Tested migration locally
- [ ] Tested rollback locally (`prisma migrate resolve`)
- [ ] Migration is backward compatible
- [ ] Plan to revert if needed
- [ ] Database backup taken (optional but recommended)

## Monitoring

### Deployment Logs

```bash
# Watch live
pm2 logs retail-api

# View GitHub Actions
https://github.com/Tharun-code-08/Inventory-control/actions

# View deployment state
cat .deploy/previous_commit
```

### Health Endpoint

```bash
curl https://api.softdigitconsulting.com/api/v1/health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-06-17T09:00:00.000Z",
    "requestId": "..."
  }
}
```

## Troubleshooting

### Deployment Failed

1. Check GitHub Actions logs
2. Check PM2 logs: `pm2 logs retail-api`
3. SSH to VPS and check manually:
   ```bash
   curl http://localhost:3000/api/v1/health
   pm2 status
   ```

### Rollback Didn't Work

1. Check if previous commit saved: `cat .deploy/previous_commit`
2. Check git status: `git status`
3. Manual rollback:
   ```bash
   PREVIOUS=$(cat .deploy/previous_commit)
   git reset --hard $PREVIOUS
   npm ci
   npm run build
   cd apps/api && npx prisma migrate deploy
   sudo pm2 restart retail-api
   ```

### Database Migration Issues

1. Check migration status:
   ```bash
   cd apps/api
   npx prisma migrate status
   ```

2. If migration is stuck:
   ```bash
   npx prisma migrate resolve --rolled-back <migration-name>
   ```

3. Check database manually:
   ```bash
   psql retail_ims -U retail
   \dt  # List tables
   ```

## Going Live

### Stage 1: Test (You)
- [ ] Empty commit test passes
- [ ] Reboot test passes
- [ ] Health check passes

### Stage 2: Beta (First 5-10 customers)
- [ ] Monitor deployment logs
- [ ] Monitor PM2 logs
- [ ] Monitor API errors
- [ ] Watch for database issues

### Stage 3: Scale (10+ customers)
- [ ] Add monitoring/alerting (Datadog, New Relic, etc.)
- [ ] Add database backups
- [ ] Consider Docker/blue-green deployments
- [ ] Document runbooks for common issues

## Ready for Customers?

### Deployment Checklist
- [ ] All 5 pre-launch tests pass
- [ ] GitHub Secrets configured correctly
- [ ] SSH private key stored ONLY in GitHub Secrets (not on VPS)
- [ ] Public key in `/home/deploy/.ssh/authorized_keys`
- [ ] VPS survives reboot with PM2 online
- [ ] Health endpoint returns 200

### If All Tests Pass
✅ **YES. Ship it.**

Your infrastructure is production-ready for:
- First 10 customers
- Daily deployments
- Rapid iteration
- Automatic error recovery

---

## Next Priorities After Launch

### Infrastructure (Do These When You Have 10+ Customers)
1. **Database Backups** - Automated PostgreSQL backups
2. **Error Tracking** - Sentry or similar for error monitoring
3. **Uptime Monitoring** - StatusPage or Ping monitoring
4. **Staging Environment** - Test deployments before production

### Engineering (Do These When You Have 50+ Customers)
1. **Dockerize** - API in Docker when deployments become frequent
2. **Blue-Green Deployments** - Zero-downtime deployments
3. **Database Replicas** - Read replicas for performance
4. **CDN** - Cache static assets globally

### Right Now (Next 2 Weeks)
❌ Don't optimize infrastructure  
✅ **Focus on:**
- Customer feedback
- Critical bugs
- Feature requests
- Product/market fit

---

## Final Notes

- **Production-grade:** Yes, for MVP SaaS stage
- **Auto-rollback:** Code only, not database
- **Downtime:** < 1 minute if deployment fails
- **Safety:** Health checks prevent broken deployments
- **Scalability:** Good for 1-100 customers

### You've Done Well

Building an ERP SaaS with:
- Vite + React frontend (Vercel)
- NestJS API backend (VPS)
- PostgreSQL database
- Automated CI/CD
- Automatic rollback

is a **solid engineering foundation** for the first 100 customers.

**Next: Run the 5 tests, add GitHub Secrets, and ship.** 🚀

Your ERP SaaS is ready. Focus on customers, not infrastructure.
