#!/bin/bash

set -euo pipefail

echo "=== Starting Inventory Control Deployment ==="
echo "Timestamp: $(date)"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to project root
cd /opt/Inventory-control

echo -e "${GREEN}✓ Working directory: $(pwd)${NC}"

# Rollback configuration
PREVIOUS_COMMIT_FILE="/tmp/previous_deploy_commit"
CURRENT_COMMIT=$(git rev-parse HEAD)

# Function to rollback on failure
rollback() {
  if [ -f "$PREVIOUS_COMMIT_FILE" ]; then
    PREVIOUS=$(cat "$PREVIOUS_COMMIT_FILE")
    echo -e "\n${RED}✗ Deployment failed at step $1${NC}"
    echo -e "${RED}Rolling back to previous commit: $PREVIOUS${NC}"
    git reset --hard "$PREVIOUS" 2>&1 | head -5
    sudo pm2 restart retail-api --update-env 2>&1 | grep -E "restart|online"
    sleep 2
    if curl -f -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Rollback successful, API restored${NC}"
    else
      echo -e "${RED}✗ WARNING: Rollback completed but health check failed${NC}"
    fi
    exit 1
  else
    echo -e "\n${RED}✗ Deployment failed at step $1 (no previous commit saved)${NC}"
    exit 1
  fi
}

# Step 1: Pull latest code
echo -e "\n${GREEN}Step 1: Pulling latest code from GitHub...${NC}"
git pull origin main --quiet || rollback "1-git-pull"
echo -e "${GREEN}✓ Code pulled${NC}"

# Step 2: Install dependencies
echo -e "\n${GREEN}Step 2: Installing dependencies...${NC}"
npm ci --quiet || rollback "2-npm-ci"
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 3: Build the project
echo -e "\n${GREEN}Step 3: Building API and Web...${NC}"
npm run build --quiet || rollback "3-npm-build"
echo -e "${GREEN}✓ Build completed${NC}"

# Step 4: Run database migrations
echo -e "\n${GREEN}Step 4: Running database migrations...${NC}"
cd apps/api || rollback "4-cd-apps-api"
npx prisma migrate deploy --quiet || rollback "4-prisma-migrate"
echo -e "${GREEN}✓ Migrations applied${NC}"
cd /opt/Inventory-control || rollback "4-cd-back"

# Step 5: Restart API
echo -e "\n${GREEN}Step 5: Restarting API service...${NC}"
sudo pm2 restart retail-api --update-env || rollback "5-pm2-restart"
echo -e "${GREEN}✓ API restarted${NC}"

# Step 6: Wait for API to be ready
echo -e "\n${GREEN}Step 6: Waiting for API to be ready...${NC}"
sleep 3

# Step 7: Health check
echo -e "\n${GREEN}Step 7: Running health check...${NC}"
if curl -f -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Health check passed (API responding)${NC}"
else
  echo -e "${RED}✗ Health check failed${NC}"
  rollback "7-health-check"
fi

# ✅ Deployment successful - save this commit as the previous for next rollback
NEW_COMMIT=$(git rev-parse HEAD)
echo "$NEW_COMMIT" > "$PREVIOUS_COMMIT_FILE"

echo -e "\n${GREEN}=== Deployment Completed Successfully ===${NC}"
echo "Timestamp: $(date)"
echo "Deployed by: $(whoami)"
echo "Branch: main"
echo "Commit: $NEW_COMMIT"
echo "Rollback saved to: $PREVIOUS_COMMIT_FILE"
