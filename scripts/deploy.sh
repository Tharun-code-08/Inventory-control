#!/bin/bash

# Deployment script with proper error handling and rollback
# Critical: Prisma migrations CANNOT be automatically rolled back
# This script rolls back code only, not database schema changes

set -Eeuo pipefail

echo "=== Starting Inventory Control Deployment ==="
echo "Timestamp: $(date)"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to project root
cd /opt/Inventory-control

echo -e "${GREEN}✓ Working directory: $(pwd)${NC}"

# Persistent rollback directory (survives reboots)
DEPLOY_STATE_DIR="/opt/Inventory-control/.deploy"
mkdir -p "$DEPLOY_STATE_DIR"
PREVIOUS_COMMIT_FILE="$DEPLOY_STATE_DIR/previous_commit"
CURRENT_STEP="init"

# Get the currently running commit BEFORE making any changes
RUNNING_COMMIT=$(git rev-parse HEAD)
echo -e "${GREEN}✓ Currently running commit: $RUNNING_COMMIT${NC}"

# Function to rollback on failure
rollback() {
  FAILED_STEP="$1"
  echo -e "\n${RED}✗ Deployment failed at step: $FAILED_STEP${NC}"

  if [ -f "$PREVIOUS_COMMIT_FILE" ]; then
    PREVIOUS=$(cat "$PREVIOUS_COMMIT_FILE")
    echo -e "${RED}Rolling back code to previous commit: $PREVIOUS${NC}"
    git reset --hard "$PREVIOUS" 2>&1 | head -3

    echo -e "${YELLOW}⚠️  IMPORTANT: Database schema is NOT rolled back${NC}"
    echo -e "${YELLOW}⚠️  If Prisma migrations failed, manual DB cleanup may be needed${NC}"

    sudo pm2 restart retail-api --update-env 2>&1 | grep -E "restart|online|error" || true
    sleep 2

    if curl -f -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Rollback successful, API restored to $PREVIOUS${NC}"
    else
      echo -e "${RED}✗ WARNING: Code rolled back but health check failed${NC}"
      echo -e "${RED}✗ Check PM2 logs: pm2 logs retail-api${NC}"
    fi
  else
    echo -e "${RED}✗ Deployment failed (no previous commit baseline)${NC}"
    echo -e "${YELLOW}⚠️  Manual recovery may be needed${NC}"
  fi

  exit 1
}

# Set trap to catch errors on any command
trap 'rollback "$CURRENT_STEP"' ERR

# Step 1: Validate environment
CURRENT_STEP="validate"
echo -e "\n${GREEN}Step 1: Validating environment...${NC}"
if ! command -v git &> /dev/null; then echo "git not found"; exit 1; fi
if ! command -v npm &> /dev/null; then echo "npm not found"; exit 1; fi
if ! command -v curl &> /dev/null; then echo "curl not found"; exit 1; fi
echo -e "${GREEN}✓ All required tools found${NC}"

# Step 2: Pull latest code
CURRENT_STEP="git-pull"
echo -e "\n${GREEN}Step 2: Pulling latest code from GitHub...${NC}"
git pull origin main --quiet
echo -e "${GREEN}✓ Code pulled${NC}"

# Step 3: Install dependencies
CURRENT_STEP="npm-ci"
echo -e "\n${GREEN}Step 3: Installing dependencies...${NC}"
npm ci --quiet
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 4: Build the project
CURRENT_STEP="npm-build"
echo -e "\n${GREEN}Step 4: Building API and Web...${NC}"
npm run build --quiet
echo -e "${GREEN}✓ Build completed${NC}"

# Step 5: Run database migrations
CURRENT_STEP="prisma-migrate"
echo -e "\n${GREEN}Step 5: Running database migrations...${NC}"
cd apps/api
npx prisma migrate deploy --quiet
echo -e "${GREEN}✓ Migrations applied${NC}"
cd /opt/Inventory-control

# Step 6: Restart API
CURRENT_STEP="pm2-restart"
echo -e "\n${GREEN}Step 6: Restarting API service...${NC}"
sudo pm2 restart retail-api --update-env 2>&1 | grep -E "restart|online|error" || true
echo -e "${GREEN}✓ API restart initiated${NC}"

# Step 7: Wait for API to be ready
CURRENT_STEP="wait-api"
echo -e "\n${GREEN}Step 7: Waiting for API to be ready...${NC}"
sleep 3

# Step 8: Health check
CURRENT_STEP="health-check"
echo -e "\n${GREEN}Step 8: Running health check...${NC}"
if curl -f -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Health check passed (API responding)${NC}"
else
  echo -e "${RED}✗ Health check failed${NC}"
  rollback "health-check"
fi

# ✅ Deployment successful
# Save the RUNNING commit (before this deployment) as the rollback point
echo "$RUNNING_COMMIT" > "$PREVIOUS_COMMIT_FILE"

NEW_COMMIT=$(git rev-parse --short HEAD)
echo -e "\n${GREEN}=== Deployment Completed Successfully ===${NC}"
echo "Timestamp: $(date)"
echo "Deployed by: $(whoami)"
echo "Branch: main"
echo "New commit: $NEW_COMMIT (full: $(git rev-parse HEAD))"
echo "Rollback point: $RUNNING_COMMIT (saved to $PREVIOUS_COMMIT_FILE)"
echo ""
echo -e "${YELLOW}⚠️  Important notes:${NC}"
echo "  - Database migrations are NOT automatically reversible"
echo "  - If migration fails, manual DB recovery may be needed"
echo "  - Check PM2 logs: pm2 logs retail-api"
echo "  - All errors are trapped and cause automatic rollback"
