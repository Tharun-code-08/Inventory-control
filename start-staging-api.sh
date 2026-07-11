#!/bin/bash
cd /root/Inventory-control/apps/api

# Temporarily rename production .env so staging .env.staging is used
if [ -f ".env" ]; then
  mv .env .env.production
  trap "mv .env.production .env 2>/dev/null" EXIT
fi

# Source staging environment
set -a
source .env.staging
set +a

# Copy .env.staging to .env so load-env module picks it up
cp .env.staging .env

export PORT=${API_PORT:-3000}
cd /root/Inventory-control
exec node apps/api/dist/main.js
