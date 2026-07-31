# Workflow & Automation Engine — Release Readiness

**Status: FROZEN for release.** No new features. Only bug / deployment / migration / CI / E2E fixes until pilot.

Companion docs: [GO-LIVE-RUNBOOK.md](./GO-LIVE-RUNBOOK.md) (how) · [STAGING-SCHEMA-DRIFT-REPORT.md](./STAGING-SCHEMA-DRIFT-REPORT.md) (current blocker).

---

## 1. Verification matrix — "compiles" ≠ "done"

A feature is **Done** only when it survives real execution. Today **every row is only unit-verified** — nothing has been booted, deployed, or run end-to-end. Fill columns left→right; do not skip.

| Feature | Unit | Boots (DI resolves) | Staging (deployed) | E2E (real run) | Prod |
|---|---|---|---|---|---|
| App boots with WorkflowEngineModule wired | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Graph runtime drives dunning (`graph-execution`) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Ladder sweep (default path) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| 9-stage dispatch pipeline | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| BullMQ dispatch queue (deferred re-enqueue) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Digest batching | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| WhatsApp adapter (template send) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Email adapter (tenant SMTP) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Multi-channel fallback | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Provider status webhook (signed) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Redis dedup (atomic SET NX) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Redis feature-flag / policy caches | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| RLS on new tables | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Role guards on mutating endpoints | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Analytics / timeline | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Simulation / event replay | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Predictive / assistant / optimizer (PARKED) | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |
| Frontend console + drag-drop editor | ✅ | ⬜ | ⬜ | ⬜ | ⬜ |

> "Boots" = the NestJS DI graph resolves and the process stays up (several cross-module imports + a BullMQ worker have never been instantiated). This column alone will surface the highest-risk issues.

---

## 2. E2E scenarios (must pass on staging before pilot)

Real runs, not mocks:

- [ ] Invoice created → thread created → wait → reminder → **WhatsApp sent** → Meta callback → **DELIVERED** → **READ** → payment → **thread closed**
- [ ] Payment **before** first reminder → thread resolved, nothing sent
- [ ] Customer reply → thread paused (stop-on-reply)
- [ ] WhatsApp send fails → **Email fallback** succeeds
- [ ] Quiet-hours → send **deferred** and re-fires when window opens
- [ ] Two overdue invoices, same customer → **one digest** (batching)
- [ ] Duplicate event / duplicate webhook → **idempotent** (no double send)
- [ ] Redis restart mid-flight → dedup/flags **fail open**, no blocked delivery
- [ ] API restart / worker restart → in-flight jobs resume, no loss
- [ ] Graph-execution tenant advances by `current_node_id`; ladder tenant unaffected (no double-processing)

---

## 3. Go / No-Go release gate

**No-Go if any unchecked.**

### Database & migrations
- [ ] Staging DB reconciled with `main` (see drift report) — **0 failed `_prisma_migrations` rows**
- [ ] `prisma migrate status` shows only PR #7's 5 migrations pending, then applied cleanly
- [ ] `migrate-deploy.sh` post-verify passes (no drift)
- [ ] **Full DB backup taken** immediately before deploy

### Infrastructure
- [ ] BullMQ workers healthy; `notification-dispatch` queue registered; jobs process
- [ ] Redis connected (dedup/flag/policy keys observed under `wf:*`)
- [ ] Tenant SMTP sender verified (Email) / WhatsApp creds + **Meta-approved template** verified
- [ ] `DISPATCH_WEBHOOK_SECRET` set; webhook signature validated (bad sig → 401)

### Security
- [ ] Mutating endpoints reject non-OWNER/ADMIN (403)
- [ ] RLS active (verified: `TenantRlsInterceptor` sets `app.current_company_id`); cross-tenant read returns nothing
- [ ] No secrets committed; `.env` values present on host only

### Operations
- [ ] Structured logs + queue monitoring + DLQ visibility
- [ ] Metrics scraping `workflow_dispatch_total`, `notification_deliveries_total`
- [ ] Alerts on failed jobs / send-failure ratio
- [ ] **Rollback procedure tested** (flag-off is immediate; deploy.sh auto-rollback verified)

### Validation
- [ ] Boot/smoke passed (Section 1 "Boots" column green for all rows)
- [ ] All Section 2 E2E scenarios passed on staging
- [ ] ≥ 48h soak on staging with a test tenant, no anomalies

### Send safety (customer-facing)
- [ ] Flags OFF by default; enabled **per test tenant first**, then pilot tenant
- [ ] First real send goes to a **controlled test number/inbox**, confirmed received
- [ ] Consent enforced (only OPTED_IN customers messaged)

---

## 4. Sequence (do not shortcut)

```
Backup staging → Repair _prisma_migrations → Choose canonical schema →
Reconcile drift → Deploy PR #7 → Smoke tests → E2E tests → 48h soak →
Pilot (1–2 tenants) → Prod rollout (tenant by tenant)
```

## 5. Freeze policy
Allowed during freeze: bug / deployment / migration / CI / E2E / observability fixes.
Not allowed: new features, new workflow types, ML models, additional AI automation.
Parked (dormant, flag-gated, revisit post-pilot): predictive AI, autonomous assistant, optimizer.
