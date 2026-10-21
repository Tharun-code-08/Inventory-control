#!/bin/bash
# Deployment script with automatic rollback on failure.
# Rollback restores the live release: source (git reset to the commit that was
# running), dependencies when the lockfile changed, the API and web builds, and
# build identity env vars. Set DEPLOY_SHA to deploy an exact commit.
# Rollback does NOT restore: database schema (Prisma migrations persist).
#
# Usage:  ./scripts/deploy.sh [environment] [branch]
#   environment: prod (default) | staging
#   branch:      overrides the per-environment default branch
#
# Post-split layout (2026-06-17):
#   prod    -> /opt/Inventory-control-prod    pm2 retail-ims-prod    :3001  (main)
#   staging -> /opt/Inventory-control-staging pm2 retail-ims-staging :3000  (develop)

set -Eeuo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENVIRONMENT="${1:-prod}"

case "$ENVIRONMENT" in
  prod)
    APP_DIR="/opt/Inventory-control-prod"
    PM2_APP="retail-ims-prod"
    HEALTH_PORT="3001"
    DEPLOY_BRANCH="${2:-main}"
    ;;
  staging)
    APP_DIR="/opt/Inventory-control-staging"
    PM2_APP="retail-ims-staging"
    HEALTH_PORT="3000"
    # Verified from the staging tree: it tracks origin/main (not develop).
    DEPLOY_BRANCH="${2:-main}"
    ;;
  *)
    echo -e "${RED}Unknown environment '$ENVIRONMENT' (expected: prod | staging)${NC}"
    exit 2
    ;;
esac

if [ ! -d "$APP_DIR" ]; then
  echo -e "${RED}APP_DIR does not exist: $APP_DIR${NC}"
  exit 2
fi

cd "$APP_DIR"
STATE_DIR=".deploy"
mkdir -p "$STATE_DIR"

CURRENT_STEP=""
RUNNING_COMMIT=""
# Commit that is live right now; rollback returns here.
ROLLBACK_COMMIT=""

# Restart the PM2 process and FAIL LOUDLY if it does not come back.
# (The old script used `|| true`, which silently left the stale process running.)
restart_app() {
  echo -e "${GREEN}Restarting ${PM2_APP}...${NC}"
  # sudo -E preserves exported env vars (APP_COMMIT_SHA etc.) so PM2 --update-env picks them up.
  sudo -E pm2 restart "$PM2_APP" --update-env
  sudo -E pm2 save
  # Confirm the process is actually online, not just that restart returned 0.
  local status
  status=$(sudo pm2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s).find(x=>x.name==="'"$PM2_APP"'");process.stdout.write(p?p.pm2_env.status:"missing")})')
  if [ "$status" != "online" ]; then
    echo -e "${RED}✗ ${PM2_APP} is '${status}' after restart (expected 'online')${NC}"
    return 1
  fi
}

health_ok() {
  curl -f -s "http://localhost:${HEALTH_PORT}/api/v1/health" > /dev/null 2>&1
}

rollback() {
  echo -e "\n${RED}✗ Deployment failed at: $CURRENT_STEP${NC}"

  if [ -n "$ROLLBACK_COMMIT" ]; then
    PREVIOUS="$ROLLBACK_COMMIT"
    FAILED_COMMIT=$(git rev-parse HEAD)
    echo -e "${RED}Rolling back code to the live commit: $PREVIOUS${NC}"
    git reset --hard "$PREVIOUS"

    # Dependencies changed with the failed release: reinstall the live ones.
    if ! git diff --quiet "$PREVIOUS" "$FAILED_COMMIT" -- package-lock.json; then
      echo -e "${RED}Reinstalling dependencies for $PREVIOUS...${NC}"
      rm -rf apps/mobile/node_modules 2>/dev/null || true
      npm ci --quiet || echo -e "${YELLOW}⚠ npm ci failed during rollback${NC}"
    fi

    # Restore the live builds so the executable and the web app match the rolled-back source.
    if [ -d "$STATE_DIR/dist_prev" ]; then
      echo -e "${RED}Restoring previous API dist...${NC}"
      rm -rf apps/api/dist
      cp -r "$STATE_DIR/dist_prev" apps/api/dist
    else
      echo -e "${YELLOW}⚠ No dist snapshot found — rollback will restart with current dist${NC}"
    fi
    if [ -d "$STATE_DIR/web_dist_prev" ]; then
      echo -e "${RED}Restoring previous web build...${NC}"
      rm -rf apps/web/dist
      cp -r "$STATE_DIR/web_dist_prev" apps/web/dist
    fi

    # Export build identity for the rollback commit so the startup log is accurate.
    export APP_COMMIT_SHA="$PREVIOUS"
    APP_BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"; export APP_BUILD_TIME
    APP_VERSION="$(node -p "require('./apps/api/package.json').version" 2>/dev/null || echo unknown)"; export APP_VERSION

    if restart_app; then
      sleep 5
      if health_ok; then
        echo -e "${GREEN}✓ Rollback successful (running $PREVIOUS)${NC}"
      else
        echo -e "${RED}✗ WARNING: rollback restarted but health check failed — manual intervention required${NC}"
      fi
    else
      echo -e "${RED}✗ WARNING: rollback restart failed — manual intervention required${NC}"
    fi
  fi

  echo -e "${YELLOW}⚠️  Database schema was NOT rolled back (Prisma migrations persist)${NC}"
  exit 1
}

trap 'rollback' ERR

echo "=== Deployment Start ($ENVIRONMENT) ==="
echo "Time: $(date)"
echo "Dir:  $APP_DIR | App: $PM2_APP | Port: $HEALTH_PORT | Branch: $DEPLOY_BRANCH"
# Runtime versions on this host (the API needs Node >= 22; PM2 may pin its own).
echo "Node: $(node -v) | npm: $(npm -v) | PM2 app runtime: $(pm2 describe "$PM2_APP" 2>/dev/null | grep -i 'node.js version' | awk -F'│' '{gsub(/ /,"",$3); print $3}' || true)"

# Refuse to deploy onto a Node older than apps/api/package.json#engines.node
# (undici 8 and puppeteer 25 need >= 22.19). Checked before install/build, so
# the running app is left untouched; upgrade Node on the host and redeploy.
REQUIRED_NODE="$(node -p "require('./apps/api/package.json').engines.node.replace(/^>=\\s*/, '')")"
if ! node -e '
  const cur = process.versions.node.split(".").map(Number);
  const req = process.argv[1].split(".").map(Number);
  const cmp = cur[0] - req[0] || cur[1] - req[1] || (cur[2] ?? 0) - (req[2] ?? 0);
  process.exit(cmp < 0 ? 1 : 0);
' "$REQUIRED_NODE"; then
  echo -e "${RED}✗ Node $(node -v) is older than the required >= ${REQUIRED_NODE}. Upgrade Node on this host, then redeploy. Nothing was changed.${NC}"
  exit 1
fi

# Local edits would be lost by the checkout below (the deploy workflow stashes
# them first); refuse before anything changes.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo -e "${RED}✗ Uncommitted changes to tracked files; stash or commit them, then redeploy. Nothing was changed.${NC}"
  git status --short --untracked-files=no
  exit 1
fi

# Save the live commit and builds (rollback point) BEFORE any changes.
RUNNING_COMMIT=$(git rev-parse HEAD)
# deployed_commit is written after each successful deploy. Older runs only
# wrote previous_commit, which held the live commit because the workflow pulled
# before calling this script.
if [ -f "$STATE_DIR/deployed_commit" ]; then
  ROLLBACK_COMMIT=$(cat "$STATE_DIR/deployed_commit")
elif [ -f "$STATE_DIR/previous_commit" ]; then
  ROLLBACK_COMMIT=$(cat "$STATE_DIR/previous_commit")
else
  ROLLBACK_COMMIT="$RUNNING_COMMIT"
fi
echo "Live commit (rollback point): $ROLLBACK_COMMIT"

CURRENT_STEP="save-dist-snapshot"
if [ -d "apps/api/dist" ]; then
  rm -rf "$STATE_DIR/dist_prev"
  cp -r apps/api/dist "$STATE_DIR/dist_prev"
  echo "✓ API dist snapshot saved ($STATE_DIR/dist_prev)"
else
  echo -e "${YELLOW}⚠ apps/api/dist not found — rollback will not be able to restore executable state${NC}"
fi
if [ -d "apps/web/dist" ]; then
  rm -rf "$STATE_DIR/web_dist_prev"
  cp -r apps/web/dist "$STATE_DIR/web_dist_prev"
  echo "✓ Web dist snapshot saved ($STATE_DIR/web_dist_prev)"
fi

# Step 1: Check out the release. The deploy workflow passes DEPLOY_SHA, the
# exact commit that passed CI; a manual run deploys the branch tip.
CURRENT_STEP="git-checkout"
echo -e "\n${GREEN}Fetching code...${NC}"
git fetch origin "$DEPLOY_BRANCH" --quiet
if [ -n "${DEPLOY_SHA:-}" ]; then
  if [[ ! "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]]; then
    echo -e "${RED}✗ DEPLOY_SHA must be a full commit SHA${NC}"
    false
  fi
  git merge-base --is-ancestor "$DEPLOY_SHA" "origin/$DEPLOY_BRANCH"
  TARGET_COMMIT="$DEPLOY_SHA"
else
  TARGET_COMMIT=$(git rev-parse "origin/$DEPLOY_BRANCH")
fi
git reset --hard "$TARGET_COMMIT" --quiet
echo "✓ Checked out $TARGET_COMMIT"

# Step 2: Install deps
CURRENT_STEP="npm-ci"
echo -e "\n${GREEN}Installing dependencies...${NC}"
# Mobile workspace has native/expo deps that cause ENOTEMPTY errors during
# npm ci's clean step. Remove its node_modules before running npm ci.
rm -rf apps/mobile/node_modules 2>/dev/null || true
npm ci --quiet
# NestJS's PackageLoader (in root node_modules/@nestjs) resolves packages
# relative to its own install path. If class-validator was de-hoisted into
# apps/api/node_modules by npm's workspace algorithm, it becomes invisible to
# NestJS. Copy it to the root to make it discoverable.
if [ -d "apps/api/node_modules/class-validator" ] && [ ! -d "node_modules/class-validator" ]; then
  cp -rp apps/api/node_modules/class-validator node_modules/class-validator
  echo "✓ class-validator copied to root node_modules"
fi
echo "✓ Dependencies installed"

# Step 3: Build
CURRENT_STEP="npm-build"
echo -e "\n${GREEN}Building...${NC}"
npm run build --quiet
echo "✓ Build complete"

# Step 4: Migrate database
# Delegates to migrate-deploy.sh: drift pre-check → migrate deploy → post-verify
# that the live schema matches the codebase (guards against the schema-drift 503
# class of incident). A failure here trips the ERR trap → rollback of source+dist
# (DB migrations are additive and persist; see the header note).
CURRENT_STEP="prisma-migrate"
echo -e "\n${GREEN}Running migrations...${NC}"
bash "$APP_DIR/scripts/migrate-deploy.sh"
echo "✓ Migrations applied"

# Step 5: Restart API (build identity is exported so the app can log what it is)
CURRENT_STEP="pm2-restart"
echo -e "\n${GREEN}Restarting API...${NC}"
APP_COMMIT_SHA="$(git rev-parse HEAD)"; export APP_COMMIT_SHA
APP_BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"; export APP_BUILD_TIME
APP_VERSION="$(node -p "require('./apps/api/package.json').version" 2>/dev/null || echo unknown)"; export APP_VERSION
restart_app
echo "✓ Restarted ($PM2_APP online)"

# Step 6: Health check (correct port for this environment)
# Retry loop: NestJS takes ~15-20s to bind the port on this server after pm2 marks online.
# Using `false` (not `exit 1`) so a failing health check triggers the ERR trap → rollback.
CURRENT_STEP="health-check"
echo -e "\n${GREEN}Health check (:${HEALTH_PORT})...${NC}"
HEALTH_OK=false
for i in $(seq 1 8); do
  sleep 5
  if health_ok; then
    HEALTH_OK=true
    break
  fi
  echo "  ... waiting (${i}/8)"
done
if [ "$HEALTH_OK" != "true" ]; then
  echo "Health check failed on :${HEALTH_PORT}"
  false
fi
echo "✓ Health check passed"

# Success: this commit is now live and is the rollback point for the next deploy.
git rev-parse HEAD > "$STATE_DIR/deployed_commit"
echo "$RUNNING_COMMIT" > "$STATE_DIR/previous_commit"

echo -e "\n${GREEN}=== Deployment Successful ($ENVIRONMENT) ===${NC}"
echo "Deployed commit: $(git rev-parse --short HEAD)  (APP_COMMIT_SHA=$APP_COMMIT_SHA)"
echo "Build time:      $APP_BUILD_TIME"
echo "Previous live:   $ROLLBACK_COMMIT"
echo "Time: $(date)"
