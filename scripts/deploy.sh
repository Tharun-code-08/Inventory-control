#!/bin/bash
# Deployment script with automatic rollback on failure.
# Rollback restores: source (git reset), dist snapshot (apps/api/dist), and build identity env vars.
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

  if [ -f "$STATE_DIR/previous_commit" ]; then
    PREVIOUS=$(cat "$STATE_DIR/previous_commit")
    echo -e "${RED}Rolling back code to: $PREVIOUS${NC}"
    git reset --hard "$PREVIOUS"

    # Restore the pre-build dist so the executable matches the rolled-back source.
    if [ -d "$STATE_DIR/dist_prev" ]; then
      echo -e "${RED}Restoring previous dist...${NC}"
      rm -rf apps/api/dist
      cp -r "$STATE_DIR/dist_prev" apps/api/dist
    else
      echo -e "${YELLOW}⚠ No dist snapshot found — rollback will restart with current dist${NC}"
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

# Save current running commit (rollback point) BEFORE any changes.
RUNNING_COMMIT=$(git rev-parse HEAD)
echo "Running commit: $RUNNING_COMMIT"

# Step 1: Pull
CURRENT_STEP="git-pull"
echo -e "\n${GREEN}Pulling latest code...${NC}"
git pull origin "$DEPLOY_BRANCH" --quiet
echo "✓ Pulled"

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

# Snapshot the current dist BEFORE overwriting it with a new build.
# Rollback needs the previous runnable artifact, not just the source.
CURRENT_STEP="save-dist-snapshot"
if [ -d "apps/api/dist" ]; then
  rm -rf "$STATE_DIR/dist_prev"
  cp -r apps/api/dist "$STATE_DIR/dist_prev"
  echo "✓ Dist snapshot saved ($STATE_DIR/dist_prev)"
else
  echo -e "${YELLOW}⚠ apps/api/dist not found — rollback will not be able to restore executable state${NC}"
fi

# Step 3: Build
CURRENT_STEP="npm-build"
echo -e "\n${GREEN}Building...${NC}"
npm run build --quiet
echo "✓ Build complete"

# Step 4: Migrate database
CURRENT_STEP="prisma-migrate"
echo -e "\n${GREEN}Running migrations...${NC}"
( cd apps/api && npx prisma migrate deploy )
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

# Success: save this run's starting commit as the rollback point for next time.
echo "$RUNNING_COMMIT" > "$STATE_DIR/previous_commit"

echo -e "\n${GREEN}=== Deployment Successful ($ENVIRONMENT) ===${NC}"
echo "Deployed commit: $(git rev-parse --short HEAD)  (APP_COMMIT_SHA=$APP_COMMIT_SHA)"
echo "Build time:      $APP_BUILD_TIME"
echo "Rollback point:  $RUNNING_COMMIT"
echo "Time: $(date)"
