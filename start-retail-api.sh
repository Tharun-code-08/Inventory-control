#!/bin/bash
cd /root/Inventory-control

# Use production .env configuration
set -a
source apps/api/.env.production
set +a

# Copy production .env to root so load-env module finds it
cp apps/api/.env.production .env

# Ensure correct port
export PORT=3001
export NODE_ENV=production

cd /root/Inventory-control
exec node apps/api/dist/main.js
