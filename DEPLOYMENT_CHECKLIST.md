# Deployment Checklist: Prisma Migration + Stock Refactor

**Release**: Prisma Schema Alignment & Stock System Hardening  
**Date**: 2026-07-11  
**Risk Level**: Medium  
**Rollback**: Available (see section 6)

---

## Section 1: Pre-Deployment Verification (Staging)

### 1.1 Build & Compilation

- [ ] `npm run build` completes with no errors
- [ ] `npx tsc --noEmit` returns 0 errors
- [ ] `npx prisma validate` reports schema is valid
- [ ] `npx prisma migrate status` shows "Database schema is up to date"

### 1.2 Test Suite

- [ ] `npm test` passes all 150 unit tests
- [ ] No `as any` type suppressions bypass critical business logic
- [ ] Stock service tests exercise idempotency and tenant isolation

### 1.3 Database State Verification (Before)

**Run this command on staging to establish baseline:**

```bash
npm run verify:inventory
```

**Expected output:**
```
✓ Products checked:        N,NNN
✓ Duration:                X.Xs

STATUS: ✅ PASS
No discrepancies found between stock_summary and ledger
```

- [ ] Baseline reconciliation returns **zero discrepancies**
- [ ] Document the baseline metrics (products checked, duration)

### 1.4 Staging Smoke Test

Execute the critical workflow end-to-end. Script this or perform manually:

```text
Scenario 1: Purchase Order → Goods Receipt → Stock Update

1. Create Shop A
2. Create Product (qty available: 0)
3. Create Purchase Order for 100 units
4. Confirm PO
5. Create Goods Receipt (partial): receive 40 units
6. Post GR
   ✓ Verify: stock_summary.current_stock = 40 for (Shop A, Product)
   ✓ Verify: stock_ledger has entry with shop_id = Shop A
7. Create another Goods Receipt: receive remaining 60 units
8. Post GR
   ✓ Verify: stock_summary.current_stock = 100
   ✓ Verify: PO lifecycle status = FULLY_RECEIVED

Scenario 2: Shop Isolation

1. In parallel, create Shop B
2. Create same Product in Shop B
3. Create GR for Shop B: receive 50 units
   ✓ Verify: Shop A product stock = 100 (unchanged)
   ✓ Verify: Shop B product stock = 50 (isolated)

Scenario 3: Sales Order & Goods Issue

1. In Shop A, create Sales Order for 30 units of Product
2. Confirm SO
3. Create Goods Issue: issue 30 units
4. Post GI
   ✓ Verify: stock_summary.current_stock = 70 (100 - 30)
   ✓ Verify: stock_ledger has out_qty = 30 entry
   ✓ Verify: SO fulfillment_status = PARTIAL or FULL appropriately
```

**Checklist:**
- [ ] All three scenarios complete without errors
- [ ] No exceptions in application logs
- [ ] Stock quantities match expectations

### 1.5 Database State Verification (After Smoke Test)

**Run on staging after completing smoke tests:**

```bash
npm run verify:inventory
```

- [ ] Reconciliation still returns **zero discrepancies**
- [ ] Products checked count increased (from smoke test data)
- [ ] No newly introduced mismatches

---

## Section 2: Deployment to Production

### 2.1 Pre-Deployment Backup

- [ ] Database snapshot taken (production inventory_control_prod)
- [ ] Snapshot name: `inventory-refactor-pre-deploy-{timestamp}`
- [ ] Backup verified and stored in secure location

### 2.2 Deploy Steps

```bash
# 1. Deploy application code
git push origin main  # Triggers CI/CD deployment pipeline

# 2. Wait for deployment to complete
# Monitor: deployment logs, application startup

# 3. Run database migrations (if any)
npx prisma migrate deploy

# 4. Verify application is responding
curl https://erp.example.com/api/v1/health
```

- [ ] Code deployed successfully
- [ ] Application startup logs show no errors
- [ ] Health check endpoint returns 200 OK

---

## Section 3: Post-Deployment Verification

### 3.1 Immediate Verification (Within 5 minutes)

```bash
npm run verify:inventory
```

- [ ] Reconciliation returns **zero discrepancies**
- [ ] Exit code is 0 (success)
- [ ] If any mismatches detected → **TRIGGER ROLLBACK** (see section 6)

### 3.2 Spot Checks (0–1 hour post-deploy)

Manually verify critical paths:

- [ ] Create a small test PO, receive goods, verify stock updated
- [ ] Create test SO, issue goods, verify stock decreased
- [ ] Check that different shops' stock is isolated

### 3.3 Monitoring (First 48 hours)

#### Automated Checks

```bash
# Run every 6 hours
npm run verify:inventory

# Log results to deployment tracking
```

- [ ] Reconciliation runs every 6 hours
- [ ] All runs return zero discrepancies
- [ ] Duration remains consistent (anomalies might indicate performance issues)

#### Manual Checks

- [ ] Review GR posting logs for anomalies
- [ ] Review GI posting logs for anomalies
- [ ] Monitor for any error reports related to stock or inventory
- [ ] Check high-volume products for accuracy spot-checks

#### Alerts

Set up alerts for:
- Stock quantity divergence (stock_summary ≠ ledger aggregate)
- Reconciliation script returning non-zero exit code
- Application errors in inventory module
- Cross-shop contamination (product in shop A affected by shop B operations)

---

## Section 4: Known Limitations & Future Work

### 4.1 Type Design Debt

Nine instances of `as any` in `purchase-orders.service.ts` due to Prisma type narrowing.

**When to address:** Post-deployment  
**Effort:** Low (refactor `withLifecycle()` to use proper type narrowing)  
**Impact**: None on correctness; technical debt only

**Approaches:**
- Make `withLifecycle()` generic over the input shape
- Define a shared `PurchaseOrderLike` interface
- Use Prisma validator to shape query results

### 4.2 Concurrent Access Testing

The smoke test above covers sequential operations. Future validation should add:

- Two GRs posted simultaneously for the same `(shop_id, product_id)`
- Two GIs simultaneously
- One GR and one GI racing on the same product

**When to implement:** After release (as CI/CD improvement)  
**Why it matters**: Inventory systems commonly fail under concurrent access

**Implementation**:
```typescript
// Pseudo-code for concurrent test
await Promise.all([
  postGoodsReceipt(shopA, product, qty: 50),
  postGoodsReceipt(shopA, product, qty: 50),
]);
// Verify: stock_summary = 100, no lost updates
```

### 4.3 E2E Test Infrastructure

Workflow tests are environment-blocked (Redis + test DB not running).

**When to set up:** Before next feature release  
**Effort**: Moderate (Docker Compose for test environment)  
**Benefit**: Automated regression testing on every PR

---

## Section 5: Rollback Strategy

### 5.1 When to Rollback

Rollback immediately if:

- [ ] `npm run verify:inventory` returns non-zero exit code (discrepancies detected)
- [ ] Stock_summary quantities differ from ledger aggregates
- [ ] Any evidence of cross-shop contamination
- [ ] High volume of inventory-related errors in logs

Do NOT roll back if:

- [ ] Type safety warnings (pre-existing, not caused by this release)
- [ ] E2E tests not running (pre-existing infrastructure gap)
- [ ] Minor performance changes (unless degradation > 20%)

### 5.2 Rollback Steps

```bash
# 1. Stop the application
systemctl stop retail-ims-api

# 2. Restore database to pre-deployment snapshot
# (Your infrastructure team's procedure)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier inventory-control-prod \
  --db-snapshot-identifier inventory-refactor-pre-deploy-{timestamp}

# 3. Redeploy previous application version
git checkout <previous-stable-commit>
git push origin main --force-with-lease
# (CI/CD redeploys previous build)

# 4. Verify rollback
npm run verify:inventory
curl https://erp.example.com/api/v1/health

# 5. Notify stakeholders
# Document what went wrong for post-incident review
```

**Estimated rollback time**: 15–30 minutes  
**Data loss**: None (snapshot-based restoration)

### 5.3 Post-Rollback Investigation

1. Restore the pre-deploy database snapshot to a **separate database** for analysis
2. Run reconciliation against that database
3. Identify which part of the refactor caused the divergence
4. Fix and re-test on staging
5. Re-attempt deployment

---

## Section 6: Success Criteria

Deployment is successful when:

✅ `npm run verify:inventory` returns zero discrepancies  
✅ All smoke test scenarios complete correctly  
✅ No cross-shop contamination observed  
✅ Stock quantities match expected values  
✅ 48-hour monitoring period completes without incidents  

---

## Sign-Off

| Role                   | Name | Date | Signature |
| ---------------------- | ---- | ---- | --------- |
| Release Engineer       |      |      |           |
| Database Administrator |      |      |           |
| On-Call Support        |      |      |           |
| Product Owner          |      |      |           |

---

## Appendix: Reference Commands

```bash
# Pre-deployment
npm run build
npm run test
npx tsc --noEmit
npx prisma validate
npx prisma migrate status
npm run verify:inventory

# Post-deployment (immediately)
npm run verify:inventory

# Post-deployment (monitoring)
npm run verify:inventory --shop-id=<specific-shop-uuid>

# Rollback (if needed)
git checkout <previous-version>
# [restore database from snapshot]
npm run verify:inventory
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-07-11  
**Next Review**: After successful production deployment
