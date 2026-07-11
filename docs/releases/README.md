# Release Documentation

This directory contains release packages for the Inventory Control ERP.

---

## Release Philosophy

Every release must demonstrate that the system **maintains its invariants**:

* ✅ Inventory totals remain correct (stock_summary = ledger aggregate)
* ✅ Shop isolation is never violated (cross-shop contamination = blocker)
* ✅ Ledger and summary never diverge (reconciliation gates this)
* ✅ Documents remain internally consistent (schema alignment enforced)
* ✅ Deployments are verifiable and reversible (gates + backups)

The goal is not "compiler passes" or "tests pass" — it's **"the system demonstrated the properties we care about."**

---

## Release Template

Every release follows this structure:

```
docs/releases/<release-name>/
├── RELEASE_SUMMARY.md           # Executive overview, gate criteria
├── DEPLOYMENT_CHECKLIST.md      # Operational runbook, rollback plan
├── STAGING_EXECUTION.md         # Step-by-step validation procedures
└── POST_DEPLOYMENT.md           # Retrospective & metrics tracking
```

Copy `TEMPLATE/` to create a new release, then customize for your specific changes.

---

## Gate-Based Deployment

Every release enforces these gates in sequence:

| Stage | Gate | Pass Criteria | Failure Action |
| ----- | ---- | ------------- | -------------- |
| **CI** | Build + Tests | All pass | Fix and rerun |
| **Staging** | Baseline reconciliation | 0 discrepancies | Investigate data, don't assume release caused it |
| **Staging** | Smoke tests | All scenarios pass | Debug and repeat |
| **Staging** | Post-test reconciliation | 0 discrepancies | Block promotion, investigate |
| **Production** | Health check + reconciliation | 0 discrepancies | Rollback if divergence detected |

**Decision principle**: Base the production decision on **gate results**, not confidence ratings.

---

## Reconciliation as Operational Habit

The `verify:inventory` tool is not just for deployments. Use it for:

* **Nightly scheduled run** — Track system health over time
* **Weekly summary report** — Operational metrics dashboard
* **On-demand investigation** — When discrepancies appear
* **Incident response** — Fastest way to confirm/rule out inventory corruption
* **Release validation** — Before and after deployment

Track metrics across releases:

| Release | Date | Products | Shops | Discrepancies | Duration | Status |
| ------- | ---- | -------: | ----: | ------------: | -------: | ------ |
| v1.0.0  | 2026-07-11 | 8,421 | 14 | 0 | 2.4s | ✅ |
| v1.0.1  | [TBD] | [TBD] | [TBD] | [TBD] | [TBD]s | |

This becomes operational evidence of system health.

---

## Creating a New Release

1. Copy `TEMPLATE/` to a new directory: `docs/releases/<release-name>/`
2. Customize the documents for your changes
3. Add to your branch
4. Follow the gate sequence
5. After deployment, complete `POST_DEPLOYMENT.md` retrospective
6. Archive metrics in the table above

---

## Invariants Over Features

As new modules are designed, prioritize protecting these invariants:

* **Inventory accuracy** — Ledger and summary must stay in sync
* **Tenant isolation** — Shop A's operations never affect Shop B
* **Audit trail** — All stock movements are recorded with context
* **Reversibility** — Every state change can be traced and understood
* **Consistency** — No partial states visible to external systems

These invariants matter more than any individual feature. A slow feature that maintains invariants is better than a fast feature that breaks them.

---

## Questions?

For guidance on release procedures, see the individual release directories.  
For architectural decisions around invariants, consult the system design docs.
