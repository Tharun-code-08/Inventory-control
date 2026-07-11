# Staging Deployment Execution Guide

**Release Branch**: `release/prisma-stock-hardening`  
**Status**: Ready for push  
**Date**: 2026-07-11

---

## Gate Decision Matrix

Use this to determine action for each validation gate:

| Gate                     | Result | Action                                                                                        |
| ------------------------ | ------ | --------------------------------------------------------------------------------------------- |
| CI                       | ❌ Fail | Fix the issue and rerun CI. Do not merge.                                                     |
| Baseline reconciliation  | ❌ Fail | Investigate existing data inconsistency before deploying. Don't assume the release caused it. |
| Smoke test               | ❌ Fail | Treat as a release blocker. Debug and repeat the scenario after the fix.                      |
| Post-test reconciliation | ❌ Fail | Block promotion. Determine whether the discrepancy came from the new code or the test itself. |
| All gates                | ✅ Pass | Approve production deployment.                                                                |

**Important**: Make the production decision based on gate results, not confidence ratings.

---

## Recording Test Identifiers

When you create test data during smoke tests, record these identifiers:

```
Shop IDs: _________________________
Product IDs: _______________________
PO Numbers: _________________________
GR Numbers: _________________________
SO Numbers: _________________________
Test timestamps: _____________________
```

These make it much faster to investigate any discrepancies reported by reconciliation.

---

## Step 1: Push Feature Branch to Origin

```bash
git push origin release/prisma-stock-hardening
```

This triggers CI validation on the branch.

**Checklist:**
- [ ] Branch pushed to GitHub
- [ ] CI pipeline started (visible in GitHub Actions/your CI system)
- [ ] Wait for CI to complete (should pass all gates):
  - [ ] Build succeeds
  - [ ] Tests pass (150/150)
  - [ ] Prisma validation passes
  - [ ] verify:inventory passes (baseline)

---

## Step 2: Merge to Main (After CI Passes)

Once CI passes on the feature branch:

```bash
# Option A: Via GitHub PR (recommended for audit trail)
# - Create PR from release/prisma-stock-hardening → main
# - Review the 5 commits
# - Merge via GitHub

# Option B: Local merge (if direct merge is your workflow)
git checkout main
git pull origin main
git merge --no-ff release/prisma-stock-hardening
git push origin main
```

**Checklist:**
- [ ] 5 commits reviewed and approved
- [ ] PR merged to main
- [ ] Main branch now contains:
  - Cookie-parser fix for e2e tests
  - Inventory verification script
  - Deployment checklist
  - Release summary
  - Metrics fix

---

## Step 3: Deploy to Staging Environment

SSH to staging server:

```bash
ssh staging-server
cd /path/to/retail-ims-staging

# 1. Pull latest code
git pull origin main
git log --oneline -5  # Verify 5 commits are present
```

### 3.1 Pre-Deployment Backup

```bash
# Backup staging database
timestamp=$(date +%Y%m%d_%H%M%S)
pg_dump retail_ims_staging > \
  /backups/retail_ims_staging_pre_refactor_${timestamp}.sql

echo "Backup: /backups/retail_ims_staging_pre_refactor_${timestamp}.sql"
```

**Checklist:**
- [ ] Database backed up
- [ ] Backup filename recorded
- [ ] Backup verified (check file size is non-zero)

### 3.2 Install & Compile

```bash
# From root of repo
npm ci

# Verify build
npm run build
```

**Exit on error**: If build fails, troubleshoot immediately. Do not proceed.

**Checklist:**
- [ ] `npm ci` completes without error
- [ ] `npm run build` completes without error
- [ ] No compilation warnings about types

### 3.3 Generate & Validate

```bash
# Generate Prisma client against current schema
npx prisma generate

# Validate schema
npx prisma validate

# Check migration status
npx prisma migrate status
```

**Expected**: "Database schema is up to date!"

**Checklist:**
- [ ] `npx prisma generate` succeeds
- [ ] `npx prisma validate` confirms schema is valid
- [ ] `npx prisma migrate status` shows all migrations applied

### 3.4 Run Migrations (if any)

```bash
# Deploy any pending migrations
npx prisma migrate deploy

# Verify again
npx prisma migrate status
```

**Checklist:**
- [ ] No new migrations to deploy (this release had no schema changes)
- [ ] Migration status still shows "Database schema is up to date"

### 3.5 Run Unit Tests

```bash
npm test

# Expected: 150/150 tests passing
```

**Exit on failure**: If tests fail, investigate. Do not proceed to smoke tests.

**Checklist:**
- [ ] All 150 tests pass
- [ ] No test errors or timeouts

---

## Step 4: Baseline Reconciliation (BEFORE Smoke Test)

```bash
npm run verify:inventory > /tmp/staging_baseline_$(date +%Y%m%d_%H%M%S).txt

cat /tmp/staging_baseline_*.txt
```

**Expected output:**
```
═════════════════════════════════════════════════════
RECONCILIATION REPORT
═════════════════════════════════════════════════════

✓ Products checked:        N,NNN
✓ Shops involved:          X
✓ Ledger entries scanned:  N,NNN
✓ Duration:                X.Xs

STATUS: ✅ PASS
No discrepancies found between stock_summary and ledger
═════════════════════════════════════════════════════
```

**Checklist:**
- [ ] Exit code 0 (success)
- [ ] Output shows ✅ PASS
- [ ] Zero discrepancies reported
- [ ] Baseline metrics recorded for comparison

---

## Step 5: Execute Smoke Tests

Create test data in a dedicated shop to avoid corrupting existing data.

### 5.1 Setup: Create Test Shop & Product

Via API or database:

```sql
-- Create test shop
INSERT INTO shops (id, shop_number, shop_name, address, contact_person, mobile, email, is_active)
VALUES (
  gen_random_uuid(),
  'TEST-STAGING-001',
  'Test Shop for Refactor Validation',
  '123 Test Lane',
  'Test Lead',
  '555-0001',
  'test@example.com',
  true
);

-- Get the shop ID for use in tests
SELECT id FROM shops WHERE shop_number = 'TEST-STAGING-001';
```

### 5.2 Scenario 1: Purchase Order → Goods Receipt → Stock Verification

```text
1. Create PO:
   - Shop: TEST-STAGING-001
   - Product: [pick any existing product]
   - Qty: 100 units
   - Rate: $50

2. Confirm PO
   ✓ Verify status changes to CONFIRMED

3. Create Goods Receipt (partial):
   - GR Qty: 40 units
   - Post GR
   ✓ Verify: stock_summary.current_stock = 40
   ✓ Verify: stock_ledger has entry with shop_id = TEST-STAGING-001

4. Create second Goods Receipt:
   - GR Qty: 60 units
   - Post GR
   ✓ Verify: stock_summary.current_stock = 100
   ✓ Verify: PO lifecycle status = FULLY_RECEIVED

5. Check inventory report:
   - Query: GET /api/v1/reports/inventory?shop_id=TEST-STAGING-001
   ✓ Verify: Product shows 100 units
```

**Checkpoint:**
- [ ] All API calls return expected status codes (201/200)
- [ ] No errors in application logs
- [ ] Stock quantity matches expected value (100)

### 5.3 Scenario 2: Shop Isolation Verification

```text
1. Create second test shop: TEST-STAGING-002

2. In TEST-STAGING-002, create GR for same product:
   - GR Qty: 50 units
   - Post GR

3. Verify isolation:
   - TEST-STAGING-001 product stock = 100 (UNCHANGED)
   - TEST-STAGING-002 product stock = 50 (isolated)

4. Check inventory report for each shop separately:
   - GET /api/v1/reports/inventory?shop_id=TEST-STAGING-001
     ✓ Should show 100 units
   - GET /api/v1/reports/inventory?shop_id=TEST-STAGING-002
     ✓ Should show 50 units
```

**Checkpoint:**
- [ ] Each shop's stock is independent
- [ ] No cross-shop contamination observed

### 5.4 Scenario 3: Sales Order → Goods Issue → Stock Verification

```text
1. In TEST-STAGING-001, create Sales Order:
   - Product: [same product from Scenario 1]
   - Qty: 30 units

2. Confirm SO
   ✓ Verify status = CONFIRMED

3. Create Goods Issue:
   - Issue Qty: 30 units
   - Post GI

4. Verify stock decreased:
   ✓ Verify: stock_summary.current_stock = 70 (100 - 30)
   ✓ Verify: stock_ledger has out_qty = 30 entry
   ✓ Verify: SO fulfillment_status updated correctly

5. Check inventory report:
   - GET /api/v1/reports/inventory?shop_id=TEST-STAGING-001
   ✓ Should show 70 units
```

**Checkpoint:**
- [ ] Stock decreased from 100 to 70
- [ ] Ledger entry created with out_qty = 30
- [ ] SO fulfillment status updated

---

## Step 6: Post-Test Reconciliation (AFTER Smoke Tests)

```bash
npm run verify:inventory > /tmp/staging_posttest_$(date +%Y%m%d_%H%M%S).txt

cat /tmp/staging_posttest_*.txt
```

**Expected:**
- Still ✅ PASS
- More products checked (from test data)
- Zero discrepancies

**Checklist:**
- [ ] Exit code 0 (success)
- [ ] Output shows ✅ PASS
- [ ] Zero discrepancies reported

---

## Step 7: Compare Baseline vs Post-Test

```bash
echo "=== BASELINE ===" && cat /tmp/staging_baseline_*.txt
echo ""
echo "=== POST-TEST ===" && cat /tmp/staging_posttest_*.txt
```

**Analysis:**
- Products checked: Should be higher in post-test (due to test data)
- Discrepancies: Should remain 0 in both
- Duration: Should be comparable (don't worry about small variations)

**Checklist:**
- [ ] No new discrepancies introduced
- [ ] Metrics are consistent
- [ ] System behaves correctly under these operations

---

## Step 8: Staging Validation Complete

Create a summary document:

```bash
cat > /tmp/staging_validation_report_$(date +%Y%m%d_%H%M%S).txt << EOF
STAGING VALIDATION REPORT
==========================

Release: Prisma Migration & Stock System Refactor
Date: $(date)
Environment: staging.retail-ims

BUILD VERIFICATION
✅ npm ci: passed
✅ npm run build: passed
✅ npm test: 150/150 passed
✅ npx tsc --noEmit: passed
✅ npx prisma validate: passed

SMOKE TESTS
✅ Scenario 1 (PO→GR→Stock): PASSED
✅ Scenario 2 (Shop isolation): PASSED
✅ Scenario 3 (SO→GI→Stock): PASSED

RECONCILIATION GATES
✅ Pre-test baseline: PASS (0 discrepancies)
✅ Post-test verification: PASS (0 discrepancies)

RECOMMENDATION
✅ APPROVED FOR PRODUCTION DEPLOYMENT

Approvals:
Release Engineer: ________________  Date: _______
EOF

cat /tmp/staging_validation_report_*.txt
```

---

## Sign-Off for Production

Once all staging gates pass, notify stakeholders:

```
STAGING VALIDATION: ✅ COMPLETE

All tests passed:
- Build verification: PASS
- Unit tests: 150/150 PASS
- Smoke test scenarios: 3/3 PASS
- Reconciliation gates: PASS → PASS (zero discrepancies both times)

This release is approved for production deployment.

Staging validation report: [attach report file]
Deployment window: [specify date/time]
Rollback plan: Database snapshot at [backup timestamp]
```

---

## Troubleshooting

### Build fails

```bash
# Check for TypeScript errors
npx tsc --noEmit

# Check dependencies
npm ci --verbose
```

### Tests fail

```bash
# Run specific test
npm test -- stock.service.spec.ts

# Check logs
cat logs/test.log
```

### Reconciliation shows discrepancies

```bash
# Check which products have mismatches
npm run verify:inventory --shop-id=<shop-id>

# Investigate the specific product
psql retail_ims_staging -c "
  SELECT * FROM stock_summary
  WHERE product_id = '<product-id>'
"

# Check ledger entries
psql retail_ims_staging -c "
  SELECT SUM(in_qty), SUM(out_qty)
  FROM stock_ledger
  WHERE product_id = '<product-id>'
"
```

If you cannot resolve discrepancies:
- **Stop immediately**
- **Restore database from backup**
- Report issue and wait for fixes

---

## What to Do With Stashed Changes

After this release completes, you have improvements waiting to merge:

```bash
# View stashed changes
git stash list

# In a new branch, apply them:
git checkout -b chore/security-and-linting
git stash pop

# Review and create a separate PR:
git push origin chore/security-and-linting
# [Create PR for the linting and security improvements]
```

---

**Ready to execute?** Begin with Step 1 on staging server.
