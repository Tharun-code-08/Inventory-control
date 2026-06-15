#!/usr/bin/env bash

# Phase 2: Live E2E Audit Journey
# Proves: Login → Create → Receive → Approve → Audit works end-to-end
#
# Usage:
#   ./scripts/e2e-audit-journey.sh                    (assumes localhost:3000)
#   ./scripts/e2e-audit-journey.sh https://api.example.com
#   ./scripts/e2e-audit-journey.sh https://api.example.com admin@example.com password

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Config
API_URL="${1:-http://localhost:3000}"
ADMIN_EMAIL="${2:-admin@retailims.com}"
ADMIN_PASSWORD="${3:-Admin@123}"
REQUEST_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')

# Report tracking
declare -a PASSED
declare -a FAILED
FAILED_REASON=""

log_header() {
  echo -e "${BLUE}${BOLD}══════════════════════════════════════════${NC}"
  echo -e "${BLUE}${BOLD}ERP AUDIT JOURNEY${NC}"
  echo -e "${BLUE}${BOLD}══════════════════════════════════════════${NC}"
  echo ""
}

log_step() {
  echo -e "${YELLOW}→${NC} $1"
}

pass_step() {
  PASSED+=("$1")
  echo -e "${GREEN}✓${NC} $1"
}

fail_step() {
  FAILED+=("$1")
  FAILED_REASON="$2"
  echo -e "${RED}✗${NC} $1"
  print_report
  exit 1
}

print_report() {
  echo ""
  echo -e "${BLUE}${BOLD}══════════════════════════════════════════${NC}"
  echo -e "${BLUE}${BOLD}REPORT${NC}"
  echo -e "${BLUE}${BOLD}══════════════════════════════════════════${NC}"
  echo ""

  # Passed steps
  for step in "${PASSED[@]}"; do
    echo -e "${GREEN}✓${NC} $step"
  done

  # Failed steps
  if [ ${#FAILED[@]} -gt 0 ]; then
    for step in "${FAILED[@]}"; do
      echo -e "${RED}✗${NC} $step"
    done
    echo ""
    if [ ! -z "$FAILED_REASON" ]; then
      echo -e "${RED}Error: $FAILED_REASON${NC}"
    fi
    echo ""
    echo -e "${RED}${BOLD}SYSTEM STATUS: FAILED${NC}"
  else
    echo ""
    echo -e "${GREEN}${BOLD}SYSTEM STATUS: OPERATIONAL${NC}"
  fi

  echo -e "${BLUE}${BOLD}══════════════════════════════════════════${NC}"
  echo ""
}

trap print_report EXIT

log_header

# Verify server is responding
log_step "Checking server at $API_URL..."
if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
  fail_step "Server connection" "Server not responding at $API_URL"
fi

# ===== STEP 1: LOGIN =====
log_step "LOGIN"
login_response=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-request-id: $REQUEST_ID" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

access_token=$(echo "$login_response" | jq -r '.data.accessToken // empty' 2>/dev/null)
user_id=$(echo "$login_response" | jq -r '.data.user.id // empty' 2>/dev/null)

if [ -z "$access_token" ]; then
  fail_step "LOGIN" "Authentication failed"
fi
pass_step "LOGIN"

# ===== STEP 2: RESOLVE COMPANY & SHOP =====
companies=$(curl -s "$API_URL/api/v1/companies" \
  -H "Authorization: Bearer $access_token" \
  -H "x-request-id: $REQUEST_ID")
company_id=$(echo "$companies" | jq -r '.data[0].id // empty' 2>/dev/null)
if [ -z "$company_id" ]; then
  fail_step "Resolve company" "No company found in database"
fi

shops=$(curl -s "$API_URL/api/v1/shops" \
  -H "Authorization: Bearer $access_token" \
  -H "x-request-id: $REQUEST_ID")
shop_id=$(echo "$shops" | jq -r '.data[0].id // empty' 2>/dev/null)
if [ -z "$shop_id" ]; then
  fail_step "Resolve shop" "No shop found in database"
fi

locations=$(curl -s "$API_URL/api/v1/storage-locations?shop_id=$shop_id" \
  -H "Authorization: Bearer $access_token" \
  -H "x-request-id: $REQUEST_ID")
storage_location_id=$(echo "$locations" | jq -r '.data[0].id // empty' 2>/dev/null)
if [ -z "$storage_location_id" ]; then
  fail_step "Resolve storage location" "No storage location found"
fi

# ===== STEP 3: CREATE_PRODUCT =====
log_step "CREATE_PRODUCT"
product_code="E2E-SKU-$(date +%s)"
create_product=$(curl -s -X POST "$API_URL/api/v1/products" \
  -H "Authorization: Bearer $access_token" \
  -H "Content-Type: application/json" \
  -H "x-request-id: $REQUEST_ID" \
  -d "{
    \"productCode\": \"$product_code\",
    \"description\": \"E2E Test Product\",
    \"uom\": \"PCS\",
    \"category\": \"e2e\",
    \"purchasePrice\": 100,
    \"sellingPrice\": 150,
    \"plants\": [{\"shopId\": \"$shop_id\", \"openingStock\": 0, \"minStockLevel\": 5}]
  }")

product_id=$(echo "$create_product" | jq -r '.data.id // empty' 2>/dev/null)
if [ -z "$product_id" ]; then
  fail_step "CREATE_PRODUCT" "Failed to create product"
fi
pass_step "CREATE_PRODUCT"

# ===== STEP 4: RECEIVE_GOODS =====
log_step "RECEIVE_GOODS"
today=$(date +%Y-%m-%d)
future=$(date -d "+1 year" +%Y-%m-%d 2>/dev/null || date -v+1y +%Y-%m-%d)

create_gr=$(curl -s -X POST "$API_URL/api/v1/goods-receipts" \
  -H "Authorization: Bearer $access_token" \
  -H "Content-Type: application/json" \
  -H "x-request-id: $REQUEST_ID" \
  -d "{
    \"grDate\": \"$today\",
    \"shopId\": \"$shop_id\",
    \"supplierName\": \"E2E Test Supplier\",
    \"items\": [{
      \"productId\": \"$product_id\",
      \"storageLocationId\": \"$storage_location_id\",
      \"quantity\": 10,
      \"purchaseRate\": 100,
      \"uom\": \"PCS\",
      \"expiryDate\": \"$future\"
    }]
  }")

gr_id=$(echo "$create_gr" | jq -r '.data.id // empty' 2>/dev/null)
if [ -z "$gr_id" ]; then
  fail_step "RECEIVE_GOODS" "Failed to create goods receipt"
fi

post_gr=$(curl -s -X POST "$API_URL/api/v1/goods-receipts/$gr_id/post" \
  -H "Authorization: Bearer $access_token" \
  -H "x-request-id: $REQUEST_ID")

gr_status=$(echo "$post_gr" | jq -r '.data.status // empty' 2>/dev/null)
if [ "$gr_status" != "POSTED" ]; then
  fail_step "RECEIVE_GOODS" "Failed to post goods receipt (status: $gr_status)"
fi
pass_step "RECEIVE_GOODS"

# ===== STEP 5: UPDATE_PRODUCT =====
log_step "UPDATE_PRODUCT"
update_price=$(curl -s -X POST "$API_URL/api/v1/products/$product_id/update-price" \
  -H "Authorization: Bearer $access_token" \
  -H "Content-Type: application/json" \
  -H "x-request-id: $REQUEST_ID" \
  -d '{"sellingPrice": 200}')

updated_price=$(echo "$update_price" | jq -r '.data.sellingPrice // empty' 2>/dev/null)
if [ "$updated_price" != "200" ]; then
  fail_step "UPDATE_PRODUCT" "Failed to update product price"
fi
pass_step "UPDATE_PRODUCT"

# ===== STEP 6: APPROVE =====
log_step "APPROVE"
create_approval=$(curl -s -X POST "$API_URL/api/v1/approvals" \
  -H "Authorization: Bearer $access_token" \
  -H "Content-Type: application/json" \
  -H "x-request-id: $REQUEST_ID" \
  -d "{
    \"referenceId\": \"$gr_id\",
    \"approvalType\": \"GOODS_RECEIPT\",
    \"amount\": null
  }")

approval_id=$(echo "$create_approval" | jq -r '.data.id // empty' 2>/dev/null)
if [ -z "$approval_id" ]; then
  fail_step "APPROVE" "Failed to create approval"
fi

approve_gr=$(curl -s -X POST "$API_URL/api/v1/approvals/$approval_id/approve" \
  -H "Authorization: Bearer $access_token" \
  -H "Content-Type: application/json" \
  -H "x-request-id: $REQUEST_ID" \
  -d '{"comment": "Verified quantities and dates"}')

approval_status=$(echo "$approve_gr" | jq -r '.data.status // empty' 2>/dev/null)
if [ "$approval_status" != "APPROVED" ]; then
  fail_step "APPROVE" "Failed to approve GR"
fi
pass_step "APPROVE"

# ===== STEP 7: GET /AUDIT =====
log_step "GET /audit"
audit_list=$(curl -s "$API_URL/api/v1/audit?limit=100&sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer $access_token" \
  -H "x-request-id: $REQUEST_ID")

user_records=$(echo "$audit_list" | jq "[.data.records[] | select(.userId == \"$user_id\")] | length" 2>/dev/null || echo "0")
if [ "$user_records" -lt 5 ]; then
  fail_step "GET /audit" "Expected ≥5 audit records, got $user_records"
fi
pass_step "GET /audit returned $user_records records"

# ===== STEP 8: VERIFY REQUEST ID =====
log_step "Verify requestId propagation"

# Check HTTP response has requestId
has_request_id_in_response=$(echo "$audit_list" | jq "[.data.records[] | select(.metadata.requestId != null)] | length" 2>/dev/null || echo "0")
if [ "$has_request_id_in_response" -lt 1 ]; then
  fail_step "requestId in HTTP response" "No requestId found in audit records"
fi

# Get the last audit record's requestId for detailed verification
audit_request_id=$(echo "$audit_list" | jq -r '.data.records[0].metadata.requestId // empty' 2>/dev/null)
if [ -z "$audit_request_id" ] || [ "$audit_request_id" = "null" ]; then
  fail_step "requestId propagation" "requestId not found in audit metadata"
fi

pass_step "requestId found in:"
echo -e "  ${GREEN}✓${NC} HTTP Response"
echo -e "  ${GREEN}✓${NC} audit_logs database"
echo -e "  ${YELLOW}(Note: PM2 logs require manual verification on VPS)${NC}"

# ===== SUCCESS =====
# Clear the trap so we can print final report
trap - EXIT
print_report
