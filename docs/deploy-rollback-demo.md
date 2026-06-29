# Rollback End-to-End Demo Procedure

**Status: Completed 2026-06-29 on staging (commit `5c0c3bb9`). All four criteria passed.**

This document records the procedure used to demonstrate the `rollback()` function in
`scripts/deploy.sh` end-to-end. It can be re-run against any future commit to validate
that rollback continues to work after script changes.

---

## Evidence standard

Match the same standard used for the forward-deploy validation:

| Criterion | How to verify |
|-----------|---------------|
| HEAD matches rollback commit | `git -C $APP_DIR rev-parse HEAD` |
| dist corresponds to rollback commit | `git -C $APP_DIR show HEAD:apps/api/package.json \| node -p "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).version"` vs dist build time |
| Startup log reports rollback SHA | `pm2 jlist \| node -e '...'` → `APP_COMMIT_SHA` field |
| Endpoint behaves as previous version | `curl -f http://localhost:$PORT/api/v1/health` returns 200 |

---

## Steps

### 1. Verify pre-conditions

```bash
cd /opt/Inventory-control-staging

# Staging should be clean (all changes committed) and at the post-DI-FIX main HEAD.
git status
git log --oneline -3

# The app should be healthy before we start.
curl -f http://localhost:3000/api/v1/health
```

### 2. Deploy successfully (establishes baseline)

This run must succeed. It creates `dist_prev` and records the current HEAD in
`.deploy/previous_commit`.

```bash
# Run from the prod directory (script cd's into staging).
/opt/Inventory-control-prod/scripts/deploy.sh staging
```

Expected output:

```
✓ Dist snapshot saved (.deploy/dist_prev)
✓ Build complete
✓ Migrations applied
✓ Restarted (retail-ims-staging online)
✓ Health check passed
=== Deployment Successful (staging) ===
Deployed commit: <SHA>
Rollback point:  <PREVIOUS_SHA>
```

Record the "Deployed commit" SHA — that is `GOOD_SHA`. The "Rollback point" SHA is now
saved in `.deploy/previous_commit`.

### 3. Inject a controlled build failure

Add a TypeScript syntax error to any TypeScript source file:

```bash
echo 'INVALID SYNTAX — rollback demo' >> /opt/Inventory-control-staging/apps/api/src/main.ts
```

This corrupt addition does not affect the running app (which uses `dist`, not `src`). It
survives the next `git pull` because origin/main has not changed.

### 4. Run the deploy — expect rollback

```bash
/opt/Inventory-control-prod/scripts/deploy.sh staging 2>&1 | tee /tmp/rollback-demo.log
```

Expected log excerpt (after build failure):

```
✓ Dist snapshot saved (.deploy/dist_prev)

Building...
... TypeScript error ...

✗ Deployment failed at: npm-build
Rolling back code to: <GOOD_SHA>
Restoring previous dist...
Restarting retail-ims-staging...
✓ Rollback successful (running <GOOD_SHA>)
⚠️  Database schema was NOT rolled back (Prisma migrations persist)
```

### 5. Verify all four criteria

```bash
APP_DIR=/opt/Inventory-control-staging
PORT=3000

# 1. HEAD matches rollback commit
git -C $APP_DIR rev-parse HEAD
# Expected: <GOOD_SHA>

# 2. dist was restored (check build time is from before the failed deploy)
ls -la $APP_DIR/apps/api/dist/main.js

# 3. Startup log reports rollback SHA
sudo pm2 jlist | node -e '
  let s="";
  process.stdin.on("data",d=>s+=d).on("end",()=>{
    const p=JSON.parse(s).find(x=>x.name==="retail-ims-staging");
    console.log("APP_COMMIT_SHA:", p.pm2_env.APP_COMMIT_SHA);
  })
'
# Expected: <GOOD_SHA>

# 4. Endpoint responds
curl -f http://localhost:$PORT/api/v1/health
# Expected: {"status":"ok"}
```

### 6. Clean up the injected syntax error

After verifying rollback, restore main.ts:

```bash
git -C /opt/Inventory-control-staging checkout apps/api/src/main.ts
```

---

## Completed run — 2026-06-29

**Commit under test:** `5c0c3bb9` (DI-fix merge, staging)

**Trigger:** TypeScript syntax error injected into `apps/api/src/main.ts` (not committed).
`git pull` left the corrupt file in place (origin unchanged), and `nest build` failed with
9 compiler errors.

**Observed rollback sequence:**
1. `✗ Deployment failed at: npm-build` — ERR trap fired on build failure
2. `Rolling back code to: 5c0c3bb9…` — `git reset --hard` restored main.ts
3. `Restoring previous dist…` — `dist_prev` restored from snapshot taken before the build
4. `sudo -E pm2 restart retail-ims-staging --update-env` — APP_COMMIT_SHA propagated
5. `sleep 5` settle delay
6. `✓ Rollback successful (running 5c0c3bb9…)` — health check passed

**Evidence:**

| Criterion | Verification | Result |
|-----------|-------------|--------|
| HEAD = rollback commit | `git rev-parse HEAD` = `5c0c3bb9…` | ✅ |
| dist content = snapshot | `sha256(dist/main.js)` = `sha256(dist_prev/main.js)` = `ce6e762f` | ✅ |
| APP_COMMIT_SHA = rollback commit | PM2 env `APP_COMMIT_SHA` = `5c0c3bb9…` | ✅ |
| Endpoint healthy | `GET /api/v1/health` → `{"status":"ok"}` | ✅ |

**Bugs found and fixed during this exercise** (all on `fix/deploy-reliability`):
- `exit 1` in health-check path bypassed ERR trap → changed to `false`
- `sudo pm2` stripped exported env vars → changed to `sudo -E pm2`
- 3-second settle delay was too short → increased to 10s
