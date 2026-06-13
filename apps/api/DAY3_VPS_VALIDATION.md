# Day 3: VPS Validation Suite

**Status:** Implementation complete. Ready for VPS validation.

Before declaring Day 3 successful, verify three critical properties on the running VPS system.

---

## Pre-Validation Setup

```bash
# On VPS:
cd /opt/Inventory-control/apps/api
git pull origin main
npx prisma migrate status    # Verify migrations pending
npx prisma migrate deploy    # Apply migrations
npm run build
pm2 restart inventory-api
pm2 logs inventory-api --lines 100

# Wait 10 seconds for startup
sleep 10

# Verify API is responsive
curl -s http://localhost:3000/api/v1/health | jq .
```

---

## Validation 1: Transaction Atomicity

**Objective:** Prove that inventory update + audit log succeed or fail together.

### Test 1A: Inventory update succeeds, audit fails (expect rollback)

Create a test patch to `GoodsReceiptsService.post()`:

```typescript
// In src/modules/goods-receipts/goods-receipts.service.ts, line ~520
// AFTER audit.log() call, add this for testing only:

if (process.env.TEST_AUDIT_FAILURE === 'true') {
  console.log('[TEST] Simulating audit log failure');
  throw new Error('[TEST] Intentional audit failure');
}
```

**Run test:**

```bash
# 1. Create product and GR (in DRAFT)
PRODUCT_ID="test-product-$(date +%s)"
GR_ID="<gr-id-from-create>"

# 2. Get inventory BEFORE posting
psql -h 127.0.0.1 -U retail retail_ims -c \
  "SELECT product_id, current_stock FROM stock_summary 
   WHERE product_id='$PRODUCT_ID';" > /tmp/before.txt

# 3. Post GR with audit failure
TEST_AUDIT_FAILURE=true curl -X POST http://localhost:3000/api/v1/goods-receipts/$GR_ID/post \
  -H "Authorization: Bearer <JWT>" 2>&1 | jq '.message'
# Expected: "[TEST] Intentional audit failure"

# 4. Verify inventory is UNCHANGED
psql -h 127.0.0.1 -U retail retail_ims -c \
  "SELECT product_id, current_stock FROM stock_summary 
   WHERE product_id='$PRODUCT_ID';" > /tmp/after.txt

diff /tmp/before.txt /tmp/after.txt
# Expected: No difference (inventory rolled back)

# 5. Verify audit log NOT created
psql -h 127.0.0.1 -U retail retail_ims -c \
  "SELECT COUNT(*) FROM audit_logs 
   WHERE action='RECEIVE_GOODS' AND entity_id='$PRODUCT_ID';"
# Expected: 0 (no audit record created)

# 6. Verify GR status still DRAFT
psql -h 127.0.0.1 -U retail retail_ims -c \
  "SELECT status FROM goods_receipt_header WHERE id='$GR_ID';"
# Expected: DRAFT (not POSTED)
```

**Result if test passes:**
```
✅ Inventory unchanged
✅ Audit record NOT created
✅ GR status remains DRAFT
✅ Transaction atomicity confirmed
```

### Test 1B: Audit insert succeeds, then error before commit (expect rollback)

Modify test to fail AFTER audit:

```typescript
// After audit.log() in GoodsReceiptsService.post():
if (process.env.TEST_POST_AUDIT_FAILURE === 'true') {
  console.log('[TEST] Simulating post-audit failure');
  throw new Error('[TEST] Intentional post-audit failure');
}
```

**Run test:**

```bash
# Same as Test 1A, but with environment variable:
TEST_POST_AUDIT_FAILURE=true curl -X POST http://localhost:3000/api/v1/goods-receipts/$GR_ID/post \
  -H "Authorization: Bearer <JWT>" 2>&1 | jq '.message'

# Verify:
# 1. Inventory unchanged
psql -h 127.0.0.1 -U retail retail_ims -c \
  "SELECT current_stock FROM stock_summary WHERE product_id='$PRODUCT_ID';"

# 2. Audit log also NOT created
psql -h 127.0.0.1 -U retail retail_ims -c \
  "SELECT COUNT(*) FROM audit_logs 
   WHERE action='RECEIVE_GOODS' AND entity_id='$PRODUCT_ID';"
# Expected: 0 (audit rolled back too)

# 3. GR status remains DRAFT
psql -h 127.0.0.1 -U retail retail_ims -c \
  "SELECT status FROM goods_receipt_header WHERE id='$GR_ID';"
```

**Result if test passes:**
```
✅ Inventory unchanged
✅ Audit record NOT created (rolled back with inventory)
✅ GR status remains DRAFT
✅ Full transaction atomicity confirmed
```

### Test 1C: Normal post (control test - should succeed)

```bash
# Remove test environment variables
unset TEST_AUDIT_FAILURE TEST_POST_AUDIT_FAILURE

# Post GR normally
curl -X POST http://localhost:3000/api/v1/goods-receipts/$GR_ID/post \
  -H "Authorization: Bearer <JWT>" | jq '.status'
# Expected: POSTED

# Verify inventory updated
psql -h 127.0.0.1 -U retail retail_ims -c \
  "SELECT current_stock FROM stock_summary WHERE product_id='$PRODUCT_ID';"
# Expected: increased by received quantity

# Verify audit created
psql -h 127.0.0.1 -U retail retail_ims -c \
  "SELECT COUNT(*) FROM audit_logs 
   WHERE action='RECEIVE_GOODS' AND entity_id='$PRODUCT_ID';"
# Expected: 1
```

**Transaction Atomicity Validation Result:**
```
Test 1A (audit fails, expect rollback):    ✅ PASS
Test 1B (post-audit fails, expect rollback): ✅ PASS
Test 1C (normal post, expect success):      ✅ PASS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRANSACTION SAFETY: PROVEN ✅
```

---

## Validation 2: Delta Math Verification

**Objective:** Verify that `beforeQty + delta = afterQty` for every audit record.

### Query all inventory audit records:

```sql
SELECT 
  action,
  entity_id as product_id,
  metadata->>'beforeQty' as before_qty,
  metadata->>'delta' as delta,
  metadata->>'afterQty' as after_qty,
  CAST(metadata->>'beforeQty' AS INT) + 
  CAST(metadata->>'delta' AS INT) as calculated_after,
  CAST(metadata->>'afterQty' AS INT) as actual_after,
  CASE 
    WHEN (CAST(metadata->>'beforeQty' AS INT) + 
          CAST(metadata->>'delta' AS INT)) = 
         CAST(metadata->>'afterQty' AS INT)
    THEN '✅ VALID'
    ELSE '❌ INVALID'
  END as validation,
  created_at
FROM audit_logs
WHERE action IN ('RECEIVE_GOODS', 'TRANSFER_STOCK', 'STOCK_ADJUSTMENT')
ORDER BY created_at DESC;
```

**Expected output:**
```
action               | before_qty | delta | after_qty | validation | created_at
─────────────────────────────────────────────────────────────────────────────
RECEIVE_GOODS        |        120 |    30 |       150 | ✅ VALID   | 2026-06-13 14:05:...
TRANSFER_STOCK       |        200 |   -50 |       150 | ✅ VALID   | 2026-06-13 14:06:...
STOCK_ADJUSTMENT     |        100 |    -5 |        95 | ✅ VALID   | 2026-06-13 14:07:...
```

### Verify TRANSFER_STOCK shows both warehouses:

```sql
SELECT 
  metadata->>'fromWarehouse' as from_wh,
  CAST(metadata->>'beforeFromQty' AS INT) -
  CAST(metadata->>'qty' AS INT) as from_calc,
  CAST(metadata->>'afterFromQty' AS INT) as from_actual,
  CASE 
    WHEN (CAST(metadata->>'beforeFromQty' AS INT) - 
          CAST(metadata->>'qty' AS INT)) = 
         CAST(metadata->>'afterFromQty' AS INT)
    THEN '✅ SOURCE OK'
    ELSE '❌ SOURCE FAIL'
  END as source_validation,
  
  metadata->>'toWarehouse' as to_wh,
  CAST(metadata->>'beforeToQty' AS INT) +
  CAST(metadata->>'qty' AS INT) as to_calc,
  CAST(metadata->>'afterToQty' AS INT) as to_actual,
  CASE 
    WHEN (CAST(metadata->>'beforeToQty' AS INT) + 
          CAST(metadata->>'qty' AS INT)) = 
         CAST(metadata->>'afterToQty' AS INT)
    THEN '✅ DEST OK'
    ELSE '❌ DEST FAIL'
  END as dest_validation
FROM audit_logs
WHERE action='TRANSFER_STOCK'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:**
```
from_wh    | from_calc | from_actual | source_validation | to_wh | to_calc | to_actual | dest_validation
────────────────────────────────────────────────────────────────────────────────────────────────────────
shop-001   |       150 |         150 | ✅ SOURCE OK      | shop-002 |     120 |       120 | ✅ DEST OK
shop-001   |       150 |         150 | ✅ SOURCE OK      | shop-002 |     120 |       120 | ✅ DEST OK
```

**Delta Math Validation Result:**
```
Verified 10+ RECEIVE_GOODS records:    ✅ ALL VALID
Verified 10+ TRANSFER_STOCK records:   ✅ ALL VALID (both warehouses)
Verified 10+ STOCK_ADJUSTMENT records: ✅ ALL VALID (including negatives)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DELTA MATH: PROVEN ✅
```

---

## Validation 3: RequestId Propagation

**Objective:** Verify same UUID flows through HTTP request → middleware → service → audit → PM2 logs.

### Step 1: Capture RequestId from HTTP response

```bash
# Make a request and capture response headers
curl -i -X POST http://localhost:3000/api/v1/goods-receipts/$GR_ID/post \
  -H "Authorization: Bearer <JWT>" 2>&1 | tee /tmp/response.txt

# Extract x-request-id from response
REQUEST_ID=$(grep -i "^x-request-id:" /tmp/response.txt | cut -d' ' -f2 | tr -d '\r')
echo "Request ID from HTTP header: $REQUEST_ID"
```

**Example output:**
```
x-request-id: 2c42f6e5-b4d7-4e2f-a2cb-xxxxxxxxxxxxxxxx
```

### Step 2: Verify RequestId in audit_logs table

```bash
psql -h 127.0.0.1 -U retail retail_ims -c \
  "SELECT action, entity_id, request_id, created_at 
   FROM audit_logs 
   WHERE request_id='$REQUEST_ID';"
```

**Expected:**
```
action        | entity_id        | request_id                           | created_at
──────────────────────────────────────────────────────────────────────────────
RECEIVE_GOODS | product-abc-123  | 2c42f6e5-b4d7-4e2f-a2cb-xxxxxxxxxxxx | 2026-06-13 14:05:...
POST          | goods-receipt-id | 2c42f6e5-b4d7-4e2f-a2cb-xxxxxxxxxxxx | 2026-06-13 14:05:...
```

### Step 3: Verify RequestId in PM2 logs

```bash
# Search PM2 logs for the requestId
pm2 logs inventory-api --lines 1000 | grep "$REQUEST_ID"
```

**Expected output (structured JSON):**
```json
{
  "timestamp": "2026-06-13T14:05:23.456Z",
  "level": "info",
  "requestId": "2c42f6e5-b4d7-4e2f-a2cb-xxxxxxxxxxxx",
  "event": "RECEIVE_GOODS",
  "productId": "product-abc-123",
  "beforeQty": 120,
  "delta": 30,
  "afterQty": 150
}
```

### Step 4: Verify UUID format

```bash
# Check if requestId is valid UUID v4
if [[ $REQUEST_ID =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
  echo "✅ RequestId is valid UUID format"
else
  echo "❌ RequestId is NOT valid UUID format"
fi
```

### Step 5: Verify RequestId uniqueness across requests

```bash
# Make 3 sequential requests, capture requestIds
for i in {1..3}; do
  curl -s -i -X POST http://localhost:3000/api/v1/goods-receipts/$GR_ID/post \
    -H "Authorization: Bearer <JWT>" 2>&1 | grep -i "^x-request-id:" >> /tmp/request_ids.txt
done

# Extract unique IDs
cut -d' ' -f2 /tmp/request_ids.txt | tr -d '\r' | sort | uniq | wc -l
# Expected: 3 (each request has unique ID)
```

**RequestId Propagation Validation Result:**
```
HTTP Response Header:        ✅ Contains UUID
Database audit_logs:         ✅ Same UUID present
PM2 Logs:                    ✅ RequestId visible in structured JSON
UUID Format:                 ✅ Valid UUID v4
Uniqueness (per request):    ✅ Each request has unique ID
━━━━━━━━━━━━━━━━━━━━━━━━━━
OBSERVABILITY: PROVEN ✅
```

---

## Complete Validation Checklist

### Transaction Atomicity
- [ ] Test 1A: Inventory unchanged when audit fails
- [ ] Test 1B: Both inventory and audit rolled back together
- [ ] Test 1C: Normal post succeeds with both inventory and audit

### Delta Math
- [ ] RECEIVE_GOODS: beforeQty + delta = afterQty (10+ records)
- [ ] TRANSFER_STOCK: fromQty math correct (200 - 50 = 150)
- [ ] TRANSFER_STOCK: toQty math correct (70 + 50 = 120)
- [ ] STOCK_ADJUSTMENT: Negative deltas handled correctly (100 + (-5) = 95)

### RequestId Propagation
- [ ] HTTP response header contains UUID
- [ ] Database audit_logs.request_id matches HTTP header
- [ ] PM2 logs contain same UUID in structured JSON
- [ ] UUID format is valid v4
- [ ] Each request has unique ID

---

## Success Criteria: Day 3 Validation Complete

✅ **Transaction Atomicity Proven**
- Inventory + audit succeed together
- Inventory + audit fail together
- No orphaned records possible

✅ **Delta Math Verified**
- beforeQty + delta = afterQty for all records
- Transfer math validates both warehouses
- Negative deltas correctly represent losses

✅ **Observability Proven**
- Same UUID flows through entire stack
- Can correlate HTTP request → database → logs
- RequestId enables end-to-end distributed tracing

---

## If All Validations Pass

```
Day 1  Audit Infrastructure      ✅
Day 2  Auth Audit                ✅
Day 3  Inventory Audit           ✅ ← Ready for Day 4

Day 4  Product Audit             ⏳
Day 5  Approval Audit            ⏳
Day 6  E2E Testing               ⏳
```

At this point, the audit system transitions from infrastructure feature to business capability.

Business can now answer:
```
"Who changed inventory?"      → audit_logs.user_id
"By how much?"                → metadata.delta
"When?"                       → audit_logs.created_at
"Why?"                        → metadata.reason + referenceNo
"Can I trace the request?"    → audit_logs.request_id
```

---

## If Any Validation Fails

Document:
1. Which test failed
2. Exact error/output
3. Expected vs actual
4. Create issue in Day 3 branch

Do NOT proceed to Day 4 until all three validations pass.
