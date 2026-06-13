#!/usr/bin/env bash

# Phase 2: Live E2E Audit Journey
# Proves: Login → Create → Receive → Approve → Audit works end-to-end
#
# Usage:
#   ./scripts/e2e-audit-journey.sh                    (assumes localhost:3000)
#   ./scripts/e2e-audit-journey.sh https://api.example.com
#   ./scripts/e2e-audit-journey.sh https://api.example.com admin@example.com password

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Config
API_URL="${1:-http://localhost:3000}"
ADMIN_EMAIL="${2:-admin@retailims.com}"
ADMIN_PASSWORD="${3:-Admin@123}"

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}Phase 2: Live E2E Audit Journey${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
echo "API Base: $API_URL"
echo "Admin: $ADMIN_EMAIL"
echo ""

# Helpers
request_id=$(uuidgen | tr '[:upper:]' '[:lower:]')
echo "Request ID: $request_id"
echo ""

log_step() {
  echo -e "${YELLOW}→${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
  exit 1
}

# Verify server is running
log_step "Checking server health..."
if ! curl -s "$API_URL/health" > /dev/null 2>&1; then
  log_error "Server not responding at $API_URL"
fi
log_success "Server is responding"
echo ""

# ===== STEP 1: LOGIN =====
log_step "Step 1: LOGIN"
login_response=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "x-request-id: $request_id" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

access_token=$(echo "$login_response" | jq -r '.data.accessToken // empty')
user_id=$(echo "$login_response" | jq -r '.data.user.id // empty')
company_id=$(echo "$login_response" | jq -r '.data.user.companyId // empty')

if [ -z "$access_token" ]; then
  log_error "Login failed: $(echo "$login_response" | jq -r '.message // "unknown error"')"
fi
log_success "LOGIN successful (user: $user_id)"
echo ""

# ===== STEP 2: GET COMPANY & SHOP =====
log_step "Step 2: Resolving company and shop..."
companies=$(curl -s "$API_URL/api/v1/companies" \
  -H "Authorization: Bearer $access_token" \
  -H "x-request-id: $request_id")
company_id=$(echo "$companies" | jq -r '.data[0].id // empty')
[ -z "$company_id" ] && log_error "No company found"
log_success "Company ID: $company_id"

shops=$(curl -s "$API_URL/api/v1/shops" \
  -H "Authorization: Bearer $access_token" \
  -H "x-request-id: $request_id")
shop_id=$(echo "$shops" | jq -r '.data[] | select(.shopNumber == "HQ-001") | .id // empty')
if [ -z "$shop_id" ]; then
  shop_id=$(echo "$shops" | jq -r '.data[0].id // empty')
fi
[ -z "$shop_id" ] && log_error "No shop found"
log_success "Shop ID: $shop_id"

# ===== STEP 3: GET STORAGE LOCATION =====
log_step "Step 3: Resolving storage location..."
locations=$(curl -s "$API_URL/api/v1/storage-locations?shop_id=$shop_id" \
  -H "Authorization: Bearer $access_token" \
  -H "x-request-id: $request_id")
storage_location_id=$(echo "$locations" | jq -r '.data[] | select(.code == "MAIN") | .id // empty')
if [ -z "$storage_location_id" ]; then
  storage_location_id=$(echo "$locations" | jq -r '.data[0].id // empty')
fi
[ -z "$storage_location_id" ] && log_error "No storage location found"
log_success "Storage Location ID: $storage_location_id"
echo ""

# ===== STEP 4: CREATE PRODUCT =====
log_step "Step 4: CREATE PRODUCT"
product_code="E2E-SKU-$(date +%s)"
create_product=$(curl -s -X POST "$API_URL/api/v1/products" \
  -H "Authorization: Bearer $access_token" \
  -H "Content-Type: application/json" \
  -H "x-request-id: $request_id" \
  -d "{
    \"productCode\": \"$product_code\",
    \"description\": \"E2E Test Product\",
    \"uom\": \"PCS\",
    \"category\": \"e2e\",
    \"purchasePrice\": 100,
    \"sellingPrice\": 150,
    \"plants\": [{\"shopId\": \"$shop_id\", \"openingStock\": 0, \"minStockLevel\": 5}]
  }")

product_id=$(echo "$create_product" | jq -r '.data.id // empty')
[ -z "$product_id" ] && log_error "Product creation failed: $(echo "$create_product" | jq -r '.message // "unknown error"')"
log_success "CREATE_PRODUCT: $product_id"
echo ""

# ===== STEP 5: RECEIVE GOODS =====
log_step "Step 5: RECEIVE GOODS"
today=$(date +%Y-%m-%d)
future=$(date -d "+1 year" +%Y-%m-%d 2>/dev/null || date -v+1y +%Y-%m-%d)

create_gr=$(curl -s -X POST "$API_URL/api/v1/goods-receipts" \
  -H "Authorization: Bearer $access_token" \
  -H "Content-Type: application/json" \
  -H "x-request-id: $request_id" \
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

gr_id=$(echo "$create_gr" | jq -r '.data.id // empty')
[ -z "$gr_id" ] && log_error "GR creation failed: $(echo "$create_gr" | jq -r '.message // "unknown error"')"
log_success "GR Draft created: $gr_id"

# Post the GR
log_step "Posting goods receipt..."
post_gr=$(curl -s -X POST "$API_URL/api/v1/goods-receipts/$gr_id/post" \
  -H "Authorization: Bearer $access_token" \
  -H "x-request-id: $request_id")

gr_status=$(echo "$post_gr" | jq -r '.data.status // empty')
if [ "$gr_status" != "POSTED" ]; then
  log_error "GR post failed: $(echo "$post_gr" | jq -r '.message // "unknown error"')"
fi
log_success "RECEIVE_GOODS: GR posted"
echo ""

# ===== STEP 6: UPDATE PRODUCT PRICE =====
log_step "Step 6: UPDATE PRODUCT PRICE"
update_price=$(curl -s -X POST "$API_URL/api/v1/products/$product_id/update-price" \
  -H "Authorization: Bearer $access_token" \
  -H "Content-Type: application/json" \
  -H "x-request-id: $request_id" \
  -d '{"sellingPrice": 200}')

updated_price=$(echo "$update_price" | jq -r '.data.sellingPrice // empty')
if [ "$updated_price" != "200" ]; then
  log_error "Price update failed: $(echo "$update_price" | jq -r '.message // "unknown error"')"
fi
log_success "UPDATE_PRODUCT: price 150 → 200"
echo ""

# ===== STEP 7: CREATE APPROVAL & APPROVE GR =====
log_step "Step 7: APPROVE GOODS RECEIPT"
create_approval=$(curl -s -X POST "$API_URL/api/v1/approvals" \
  -H "Authorization: Bearer $access_token" \
  -H "Content-Type: application/json" \
  -H "x-request-id: $request_id" \
  -d "{
    \"referenceId\": \"$gr_id\",
    \"approvalType\": \"GOODS_RECEIPT\",
    \"amount\": null
  }")

approval_id=$(echo "$create_approval" | jq -r '.data.id // empty')
[ -z "$approval_id" ] && log_error "Approval creation failed: $(echo "$create_approval" | jq -r '.message // "unknown error"')"
log_success "Approval request created: $approval_id"

# Approve the GR
approve_gr=$(curl -s -X POST "$API_URL/api/v1/approvals/$approval_id/approve" \
  -H "Authorization: Bearer $access_token" \
  -H "Content-Type: application/json" \
  -H "x-request-id: $request_id" \
  -d '{"comment": "Verified quantities and dates"}')

approval_status=$(echo "$approve_gr" | jq -r '.data.status // empty')
if [ "$approval_status" != "APPROVED" ]; then
  log_error "Approval failed: $(echo "$approve_gr" | jq -r '.message // "unknown error"')"
fi
log_success "APPROVE: GR approved"
echo ""

# ===== STEP 8: GET /AUDIT =====
log_step "Step 8: GET /AUDIT"
audit_list=$(curl -s "$API_URL/api/v1/audit?limit=20&sortBy=createdAt&sortOrder=desc" \
  -H "Authorization: Bearer $access_token" \
  -H "x-request-id: $request_id")

# Count audit records for this user
login_count=$(echo "$audit_list" | jq "[.data.records[] | select(.userId == \"$user_id\" and .action == \"LOGIN\")] | length")
create_count=$(echo "$audit_list" | jq "[.data.records[] | select(.userId == \"$user_id\" and .action == \"CREATE_PRODUCT\")] | length")
receive_count=$(echo "$audit_list" | jq "[.data.records[] | select(.userId == \"$user_id\" and .action == \"RECEIVE_GOODS\")] | length")
update_count=$(echo "$audit_list" | jq "[.data.records[] | select(.userId == \"$user_id\" and .action == \"UPDATE_PRODUCT\")] | length")
approve_count=$(echo "$audit_list" | jq "[.data.records[] | select(.userId == \"$user_id\" and .action == \"APPROVE\")] | length")

echo "Audit records for this user:"
echo "  LOGIN: $login_count"
echo "  CREATE_PRODUCT: $create_count"
echo "  RECEIVE_GOODS: $receive_count"
echo "  UPDATE_PRODUCT: $update_count"
echo "  APPROVE: $approve_count"

if [ "$create_count" -lt 1 ] || [ "$receive_count" -lt 1 ] || [ "$update_count" -lt 1 ] || [ "$approve_count" -lt 1 ]; then
  log_error "Missing audit records"
fi
log_success "All expected audit records present"
echo ""

# ===== STEP 9: EXPORT AUDIT =====
log_step "Step 9: EXPORT AUDIT"
export_audit=$(curl -s "$API_URL/api/v1/audit/export?format=json" \
  -H "Authorization: Bearer $access_token" \
  -H "x-request-id: $request_id")

export_count=$(echo "$export_audit" | jq '[.records[] | select(.userId == "'$user_id'")] | length' 2>/dev/null || echo "0")
if [ "$export_count" -lt 5 ]; then
  echo "Export response: $(echo "$export_audit" | jq -r . | head -20)"
  log_error "Export audit has insufficient records (got $export_count, expected ≥5)"
fi
log_success "EXPORT AUDIT: $export_count records exported"
echo ""

# ===== STEP 10: VERIFY REQUEST ID PROPAGATION =====
log_step "Step 10: VERIFY REQUEST ID PROPAGATION"
# Get one audit record and verify it has the requestId
audit_record=$(echo "$audit_list" | jq ".data.records[] | select(.userId == \"$user_id\" and .action == \"APPROVE\") | .metadata.requestId" | head -1)
if [ -z "$audit_record" ] || [ "$audit_record" == "null" ]; then
  log_error "RequestId not found in audit metadata"
fi
log_success "RequestId propagated through audit system"
echo ""

# ===== SUCCESS =====
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✓ E2E Journey Complete${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
echo "Proof of System Health:"
echo "  Login works ✓"
echo "  Create Product works ✓"
echo "  Receive Goods works ✓"
echo "  Update Product works ✓"
echo "  Approve GR works ✓"
echo "  Audit records persisted ✓"
echo "  RequestId propagated ✓"
echo ""
echo "System Status: OPERATIONAL"
echo ""
