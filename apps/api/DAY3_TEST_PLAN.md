# Day 3: Inventory Audit Full Test Plan

## Setup
Deploy the changes to VPS and run migrations:
```bash
cd /opt/Inventory-control/apps/api
npx prisma migrate deploy
```

Test environment:
- API: http://localhost:3000
- Company: Use existing company or create new
- Auth: Use valid credentials (test with `gstharunadhithya@gmail.com` or existing user)

---

## Test Scenario 1: RECEIVE_GOODS

### Step 1.1: Create a test product
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "productCode": "TEST-RG-001",
    "productName": "Test Receive Goods Product",
    "category": "Electronics",
    "description": "For testing RECEIVE_GOODS audit"
  }' | jq .
```

Save the `productId` from response.

### Step 1.2: Get current inventory (should be 0)
```bash
PRODUCT_ID="<from-step-1.1>"
curl -X GET "http://localhost:3000/api/v1/inventory/summary?product_id=$PRODUCT_ID" \
  -H "Authorization: Bearer <JWT_TOKEN>" | jq '.data[0].currentStock'
```

Expected: `null` or `0` (no inventory yet)

### Step 1.3: Create a Goods Receipt in DRAFT
```bash
SHOP_ID="<your-shop-id>"
curl -X POST http://localhost:3000/api/v1/goods-receipts \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "grDate": "2026-06-13",
    "shopId": "'$SHOP_ID'",
    "supplierName": "Test Supplier",
    "receiptType": "FULL",
    "receiptSource": "OUTSIDE",
    "items": [
      {
        "productId": "'$PRODUCT_ID'",
        "quantity": 50,
        "uom": "PCS",
        "purchaseRate": 100,
        "batchNumber": "BATCH-001",
        "expiryDate": "2027-12-31",
        "storageLocationId": "<storage-location-id>"
      }
    ]
  }' | jq .
```

Save the `grNumber` from response.

### Step 1.4: Post the Goods Receipt (triggers RECEIVE_GOODS audit)
```bash
GR_ID="<gr-id-from-step-1.3>"
curl -X POST http://localhost:3000/api/v1/goods-receipts/$GR_ID/post \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" | jq .
```

**Capture the response headers** - look for `x-request-id`
```bash
curl -i -X POST http://localhost:3000/api/v1/goods-receipts/$GR_ID/post \
  -H "Authorization: Bearer <JWT_TOKEN>" | grep -i "x-request-id"
```

Save the `requestId` from response header.

### Step 1.5: Verify inventory updated
```bash
curl -X GET "http://localhost:3000/api/v1/inventory/summary?product_id=$PRODUCT_ID" \
  -H "Authorization: Bearer <JWT_TOKEN>" | jq '.data[0].currentStock'
```

**Expected: 50** (the received quantity)

### Step 1.6: Query audit log for RECEIVE_GOODS
```bash
curl -X GET "http://localhost:3000/api/v1/audit/logs?action=RECEIVE_GOODS" \
  -H "Authorization: Bearer <JWT_TOKEN>" | jq '.data[0]'
```

**Verify audit record contains:**
- ✅ `action: "RECEIVE_GOODS"`
- ✅ `entityType: "INVENTORY"`
- ✅ `entityId: <product-id>`
- ✅ `metadata.beforeQty: 0` (or null initially)
- ✅ `metadata.delta: 50`
- ✅ `metadata.afterQty: 50`
- ✅ `metadata.batchId: "BATCH-001"`
- ✅ `metadata.referenceNo: "<gr-number>"`
- ✅ `requestId: <matches-header-from-step-1.4>`

---

## Test Scenario 2: TRANSFER_STOCK

### Step 2.1: Setup - Create second shop/warehouse
Use an existing shop or create one. Save as `SHOP_2_ID`.

### Step 2.2: Verify source warehouse has inventory
```bash
curl -X GET "http://localhost:3000/api/v1/inventory/summary?product_id=$PRODUCT_ID&shop_id=$SHOP_ID" \
  -H "Authorization: Bearer <JWT_TOKEN>" | jq '.data[0].currentStock'
```

**Expected: 50** (from Step 1.5)

### Step 2.3: Create Stock Transfer in DRAFT
```bash
curl -X POST http://localhost:3000/api/v1/stock-transfers \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "fromShopId": "'$SHOP_ID'",
    "toShopId": "'$SHOP_2_ID'",
    "transferDate": "2026-06-13",
    "notes": "Test transfer for Day 3 audit",
    "items": [
      {
        "productId": "'$PRODUCT_ID'",
        "quantity": 20,
        "uom": "PCS"
      }
    ]
  }' | jq .
```

Save the `id` and `transferNumber` from response.

### Step 2.4: Post the Stock Transfer (triggers TRANSFER_STOCK audit)
```bash
ST_ID="<transfer-id-from-step-2.3>"
curl -X POST http://localhost:3000/api/v1/stock-transfers/$ST_ID/post \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" | jq .
```

**Capture requestId:**
```bash
curl -i -X POST http://localhost:3000/api/v1/stock-transfers/$ST_ID/post \
  -H "Authorization: Bearer <JWT_TOKEN>" | grep -i "x-request-id"
```

### Step 2.5: Verify inventories updated
```bash
# Source warehouse: 50 - 20 = 30
curl -X GET "http://localhost:3000/api/v1/inventory/summary?product_id=$PRODUCT_ID&shop_id=$SHOP_ID" \
  -H "Authorization: Bearer <JWT_TOKEN>" | jq '.data[0].currentStock'

# Destination warehouse: 0 + 20 = 20
curl -X GET "http://localhost:3000/api/v1/inventory/summary?product_id=$PRODUCT_ID&shop_id=$SHOP_2_ID" \
  -H "Authorization: Bearer <JWT_TOKEN>" | jq '.data[0].currentStock'
```

**Expected: 30 and 20 respectively**

### Step 2.6: Query audit log for TRANSFER_STOCK
```bash
curl -X GET "http://localhost:3000/api/v1/audit/logs?action=TRANSFER_STOCK" \
  -H "Authorization: Bearer <JWT_TOKEN>" | jq '.data[0]'
```

**Verify audit record contains:**
- ✅ `action: "TRANSFER_STOCK"`
- ✅ `entityType: "INVENTORY"`
- ✅ `metadata.fromWarehouse: <shop-1-id>`
- ✅ `metadata.toWarehouse: <shop-2-id>`
- ✅ `metadata.qty: 20`
- ✅ `metadata.beforeFromQty: 50`
- ✅ `metadata.afterFromQty: 30`
- ✅ `metadata.beforeToQty: 0` (or null)
- ✅ `metadata.afterToQty: 20`
- ✅ `metadata.referenceNo: "<transfer-number>"`
- ✅ `requestId: <from-header>`

---

## Test Scenario 3: STOCK_ADJUSTMENT

### Step 3.1: Verify current inventory
```bash
curl -X GET "http://localhost:3000/api/v1/inventory/summary?product_id=$PRODUCT_ID&shop_id=$SHOP_ID" \
  -H "Authorization: Bearer <JWT_TOKEN>" | jq '.data[0].currentStock'
```

**Expected: 30** (from Step 2.5)

### Step 3.2: Create Damaged Stock record in DRAFT
```bash
curl -X POST http://localhost:3000/api/v1/damaged-stock \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "shopId": "'$SHOP_ID'",
    "productId": "'$PRODUCT_ID'",
    "damageDate": "2026-06-13",
    "damagedQuantity": 10,
    "reason": "DAMAGED",
    "remarks": "Test damaged stock for Day 3 audit"
  }' | jq .
```

Save the `id` and `damageNumber` from response.

### Step 3.3: Post the Damaged Stock (triggers STOCK_ADJUSTMENT audit)
```bash
DM_ID="<damaged-stock-id-from-step-3.2>"
curl -X POST http://localhost:3000/api/v1/damaged-stock/$DM_ID/post \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" | jq .
```

**Capture requestId:**
```bash
curl -i -X POST http://localhost:3000/api/v1/damaged-stock/$DM_ID/post \
  -H "Authorization: Bearer <JWT_TOKEN>" | grep -i "x-request-id"
```

### Step 3.4: Verify inventory updated
```bash
curl -X GET "http://localhost:3000/api/v1/inventory/summary?product_id=$PRODUCT_ID&shop_id=$SHOP_ID" \
  -H "Authorization: Bearer <JWT_TOKEN>" | jq '.data[0].currentStock'
```

**Expected: 20** (30 - 10 damaged)

### Step 3.5: Query audit log for STOCK_ADJUSTMENT
```bash
curl -X GET "http://localhost:3000/api/v1/audit/logs?action=STOCK_ADJUSTMENT" \
  -H "Authorization: Bearer <JWT_TOKEN>" | jq '.data[0]'
```

**Verify audit record contains:**
- ✅ `action: "STOCK_ADJUSTMENT"`
- ✅ `entityType: "INVENTORY"`
- ✅ `metadata.adjustmentType: "LOSS"`
- ✅ `metadata.reason: "DAMAGED"`
- ✅ `metadata.beforeQty: 30`
- ✅ `metadata.delta: -10` (negative for loss)
- ✅ `metadata.afterQty: 20`
- ✅ `metadata.referenceNo: "<damage-number>"`
- ✅ `requestId: <from-header>`

---

## Test 4: End-to-End Entity History Query

### Step 4.1: Query all audit records for the product
```bash
curl -X GET "http://localhost:3000/api/v1/audit/logs?entity_type=INVENTORY&entity_id=$PRODUCT_ID" \
  -H "Authorization: Bearer <JWT_TOKEN>" | jq '.data | length'
```

**Expected: 3 records** (RECEIVE_GOODS, TRANSFER_STOCK, STOCK_ADJUSTMENT)

### Step 4.2: Verify ordering (newest first)
```bash
curl -X GET "http://localhost:3000/api/v1/audit/logs?entity_type=INVENTORY&entity_id=$PRODUCT_ID" \
  -H "Authorization: Bearer <JWT_TOKEN>" | jq '.data[] | "\(.action) - \(.createdAt)"'
```

**Expected output (bottom to top):**
```
RECEIVE_GOODS - 2026-06-13T...
TRANSFER_STOCK - 2026-06-13T...
STOCK_ADJUSTMENT - 2026-06-13T...
```

---

## Test 5: RequestId Tracing

### Step 5.1: Extract requestIds from database
```bash
PGPASSWORD=retail psql -h 127.0.0.1 -p 5433 -U retail -d retail_ims -c \
  "SELECT action, request_id FROM audit_logs WHERE entity_type='INVENTORY' ORDER BY created_at DESC LIMIT 3;"
```

### Step 5.2: Verify requestId consistency
Each audit record should have:
- ✅ A unique UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- ✅ Matches the HTTP response header from the API call
- ✅ Proves request → API → service → database tracing works

---

## Summary Checklist

- [ ] **RECEIVE_GOODS audit**
  - [ ] Record created in audit_logs table
  - [ ] beforeQty = 0, delta = 50, afterQty = 50
  - [ ] batchId preserved: "BATCH-001"
  - [ ] requestId matches HTTP header

- [ ] **TRANSFER_STOCK audit**
  - [ ] Record created for transfer operation
  - [ ] beforeFromQty = 50, afterFromQty = 30
  - [ ] beforeToQty = 0, afterToQty = 20
  - [ ] Shows complete warehouse flow
  - [ ] requestId matches HTTP header

- [ ] **STOCK_ADJUSTMENT audit**
  - [ ] Record created for damaged stock
  - [ ] beforeQty = 30, delta = -10, afterQty = 20
  - [ ] adjustmentType = "LOSS"
  - [ ] reason = "DAMAGED"
  - [ ] requestId matches HTTP header

- [ ] **Entity history queryable**
  - [ ] GET /audit?entity_type=INVENTORY&entity_id=... returns all 3 records
  - [ ] Records ordered by createdAt DESC
  - [ ] Index performance verified (query returns quickly)

- [ ] **Transaction safety**
  - [ ] If inventory update fails, audit log doesn't exist
  - [ ] If audit log fails, inventory update is rolled back
  - [ ] Both succeed or both fail atomically

---

## Success Criteria: Day 3 Complete

✅ All three operations (RECEIVE_GOODS, TRANSFER_STOCK, STOCK_ADJUSTMENT) create audit records with delta semantics  
✅ Audit records include inventory before/after states and deltas  
✅ RequestId flows end-to-end (HTTP header → database)  
✅ Transaction safety: inventory + audit succeed/fail together  
✅ Entity history queryable: GET /audit?entity_type=INVENTORY&entity_id=... returns all records for a product  

If all checks pass: **Day 3 is production-ready. Proceed to Day 4.**
