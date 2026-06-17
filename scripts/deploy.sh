#!/bin/bash
# Production deployment script with automatic rollback on failure
# Rollback is CODE-only (git reset), not database (Prisma migrations persist)

set -Eeuo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd /opt/Inventory-control
STATE_DIR=".deploy"
mkdir -p "$STATE_DIR"

CURRENT_STEP=""
RUNNING_COMMIT=""

rollback() {
  echo -e "\n${RED}✗ Deployment failed at: $CURRENT_STEP${NC}"

  if [ -f "$STATE_DIR/previous_commit" ]; then
    PREVIOUS=$(cat "$STATE_DIR/previous_commit")
    echo -e "${RED}Rolling back code to: $PREVIOUS${NC}"
    git reset --hard "$PREVIOUS"
    sudo pm2 restart retail-api --update-env 2>&1 | grep -E "online|error" || true
    sleep 2

    if curl -f -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Rollback successful${NC}"
    else
      echo -e "${RED}✗ WARNING: Rollback failed health check${NC}"
    fi
  fi

  echo -e "${YELLOW}⚠️  Database schema was NOT rolled back (Prisma migrations persist)${NC}"
  exit 1
}

trap 'rollback' ERR

echo "=== Deployment Start ==="
echo "Time: $(date)"

# Save current running commit (before any changes)
RUNNING_COMMIT=$(git rev-parse HEAD)
echo "Running commit: $RUNNING_COMMIT"

# Step 1: Pull
CURRENT_STEP="git-pull"
echo -e "\n${GREEN}Pulling latest code...${NC}"
git pull origin main --quiet
echo "✓ Pulled"

# Step 2: Install deps
CURRENT_STEP="npm-ci"
echo -e "\n${GREEN}Installing dependencies...${NC}"
npm ci --quiet
echo "✓ Dependencies installed"

# Step 3: Build
CURRENT_STEP="npm-build"
echo -e "\n${GREEN}Building...${NC}"
npm run build --quiet
echo "✓ Build complete"

# Step 4: Migrate database
CURRENT_STEP="prisma-migrate"
echo -e "\n${GREEN}Running migrations...${NC}"
cd apps/api
npx prisma migrate deploy --quiet
cd /opt/Inventory-control
echo "✓ Migrations applied"

# Step 5: Restart API
CURRENT_STEP="pm2-restart"
echo -e "\n${GREEN}Restarting API...${NC}"
sudo pm2 restart retail-api --update-env 2>&1 | grep -E "online|error" || true
sleep 3
echo "✓ Restart triggered"

# Step 6: Health check
CURRENT_STEP="health-check"
echo -e "\n${GREEN}Health check...${NC}"
if ! curl -f -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
  echo "Health check failed"
  exit 1
fi
echo "✓ Health check passed"

# Success: save this commit as rollback point for next deployment
NEW_COMMIT=$(git rev-parse HEAD)
echo "$RUNNING_COMMIT" > "$STATE_DIR/previous_commit"

echo -e "\n${GREEN}=== Deployment Successful ===${NC}"
echo "Deployed: $(git rev-parse --short HEAD)"
echo "Rollback point: $RUNNING_COMMIT"
echo "Time: $(date)"
