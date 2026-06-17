#!/bin/bash

set -e

echo "=== Starting Inventory Control Deployment ==="
echo "Timestamp: $(date)"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to project root
cd /opt/Inventory-control

echo -e "${GREEN}✓ Working directory: $(pwd)${NC}"

# Step 1: Pull latest code
echo -e "\n${GREEN}Step 1: Pulling latest code from GitHub...${NC}"
git pull origin main --quiet
echo -e "${GREEN}✓ Code pulled${NC}"

# Step 2: Install dependencies
echo -e "\n${GREEN}Step 2: Installing dependencies...${NC}"
npm ci --quiet
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 3: Build the project
echo -e "\n${GREEN}Step 3: Building API and Web...${NC}"
npm run build --quiet
echo -e "${GREEN}✓ Build completed${NC}"

# Step 4: Run database migrations
echo -e "\n${GREEN}Step 4: Running database migrations...${NC}"
cd apps/api
npx prisma migrate deploy --quiet
echo -e "${GREEN}✓ Migrations applied${NC}"
cd /opt/Inventory-control

# Step 5: Restart API
echo -e "\n${GREEN}Step 5: Restarting API service...${NC}"
sudo pm2 restart retail-api --update-env
echo -e "${GREEN}✓ API restarted${NC}"

# Step 6: Wait for API to be ready
echo -e "\n${GREEN}Step 6: Waiting for API to be ready...${NC}"
sleep 3

# Step 7: Health check
echo -e "\n${GREEN}Step 7: Running health check...${NC}"
if curl -f -s https://api.softdigitconsulting.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Health check passed (API responding)${NC}"
else
  echo -e "${RED}✗ Health check failed${NC}"
  exit 1
fi

echo -e "\n${GREEN}=== Deployment Completed Successfully ===${NC}"
echo "Timestamp: $(date)"
echo "Deployed by: $(whoami)"
echo "Branch: main"
echo "Commit: $(git rev-parse --short HEAD)"
