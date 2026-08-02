# Workflow & Automation Engine — Go-Live Runbook

Turnkey checklist to take PR #7 from merged → validated on **staging** → **production**.

**Guiding principle:** the engine is *safe by default*. Even fully deployed, it sends **nothing** to real customers until, per tenant, (a) the `channel-routing` flag is on, (b) provider creds + an approved template / verified SMTP exist, and (c) the customer has opted in. Every stage below is reversible by turning a flag off.

Environment facts (from ops notes):
- **staging** → `/opt/Inventory-control-staging`, pm2 `retail-ims-staging`, API `:3000`, DB `staging_retail_ims` (`:5433`), Redis `:6380`
- **prod** → `/opt/Inventory-control-prod`, pm2 `retail-ims-prod`, API `:3001`, DB `retail_ims`, Redis `:6379`
- Deploy: CI `deploy.yml` → SSH → `scripts/deploy.sh` → `scripts/migrate-deploy.sh` (drift pre-check → deploy → post-verify)

---

## Phase 0 — Pre-merge gates (before merging PR #7)

- [ ] CI green on PR #7 (tsc, tests, ShellCheck, CodeQL)
- [ ] Code review approved
- [ ] **Reconcile the failed migration history** (blocker — see Appendix A and the detailed audit **[PR #10](https://github.com/Tharun-code-08/Inventory-control/pull/10)**). Both DBs have failed `_prisma_migrations` rows (prod: 3, staging: 6) → `migrate deploy` aborts with **P3009** before app startup. Resolve *before* any `migrate deploy`. See PR #10 for the per-row `[VERIFIED]/[HYPOTHESIS]/[RECOMMENDATION]` verdicts and exact `migrate resolve` commands (backup + restore-rehearsal + DBA review required).
- [ ] Confirm the 5 new migrations are the only pending ones after reconciliation:
      `20260730140000_workflow_engine_phase3_5`, `…150000_assistant_actions`,
      `…160000_dispatch_batch_items`, `…170000_customer_activities`,
      `…180000_rls_workflow_engine_tables`

---

## Phase 1 — Deploy to staging (code + migrations, still silent)

- [ ] Merge PR #7 to `main`
- [ ] Let `deploy.yml` deploy to staging (or run `scripts/deploy.sh staging` on the host)
- [ ] Confirm `migrate-deploy.sh` applied all 5 migrations and **post-verify passed** (no drift)
- [ ] Confirm pm2 `retail-ims-staging` is `online` and the health checks pass:
  - `curl -s localhost:3000/health` → `status:"ok"`
  - `curl -s localhost:3000/health/ready` → `database:"connected"`
  - `/health/live` commit SHA == deployed SHA

> At this point new code + tables exist but **no flags are on** — the engine is inert. Nothing is sent.

---

## Phase 2 — Boot & smoke test (the first real proof — it has never run)

Authenticate as an OWNER/ADMIN of a **test tenant** and hit the read endpoints (all JWT + admin-guarded except the signed webhook):

- [ ] `GET /api/v1/workflow-engine/workflows/invoice-dunning` → returns the seeded system workflow (`seedSystemWorkflows` runs on boot). Confirms the graph registry + compiler booted.
- [ ] `POST /api/v1/workflow-engine/simulate` `{ "workflowKey": "invoice-dunning" }` → returns a dry-run timeline (no sends).
- [ ] `GET /api/v1/workflow-engine/analytics/engagement` and `/predictive/portfolio` → 200 (may be zeros).
- [ ] DB sanity: `SELECT key, latest_version FROM workflow_graphs WHERE company_id IS NULL;` → `invoice-dunning` present.
- [ ] Redis sanity: after a request, `redis-cli -p 6380 KEYS 'wf:*'` shows flag/policy cache keys.
- [ ] Logs: no DI resolution errors, no BullMQ connection errors for `notification-dispatch`.
- [ ] Role guard check: hit a mutating endpoint (e.g. `POST /workflow-engine/policies`) as a **non-admin** → `403`.

> If any of these fail, **stop** — this is exactly the runtime class of issue unit tests can't catch. Fix before proceeding.

---

## Phase 3 — Configure credentials & secrets (staging)

Set on staging `apps/api/.env` (then restart pm2):

- [ ] `DISPATCH_WEBHOOK_SECRET=<random-32B>` — HMAC secret for the delivery-status webhook (`POST /workflow-engine/webhooks/delivery-status`, header `x-signature-256: sha256=<hex>`)
- [ ] WhatsApp (base creds already present on staging): confirm `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` valid
- [ ] `WHATSAPP_DUNNING_TEMPLATE=<meta-approved-template>` (+ optional per-tone `WHATSAPP_DUNNING_TEMPLATE_FRIENDLY/REMINDER/FIRM/FINAL/ESCALATION`), `WHATSAPP_DUNNING_TEMPLATE_LANG=en`
  - **Gate:** the template must be **Meta-approved** (business-initiated dunning is outside the 24h window). Without it the WhatsApp sender degrades to ledger-only.
- [ ] Email: for the test tenant, add + verify a **primary EmailSenderIdentity** with tested SMTP (Settings → Email Notifications → Sender Email). Without it the Email sender degrades to ledger-only.
- [ ] Optional global flag defaults via env: `WORKFLOW_FLAG_SIMULATION=true`, etc. (per-tenant flags below override these.)

---

## Phase 4 — Enable in ledger-only mode (decisions, still no external sends)

Enable the sweep + decisioning **without** turning on `channel-routing` (senders stay ledger-only):

- [ ] `DUNNING_ENABLED=true` in staging `.env` → restart pm2 (registers the daily sweep scheduler)
- [ ] Optionally trigger a sweep immediately (enqueue the `dunning-sweep` repeatable job or wait for 09:00 UTC)
- [ ] Verify decisioning ran **without sending**:
  - `SELECT outcome, channel, count(*) FROM workflow_decision_logs GROUP BY 1,2;` → rows appear (SENT rows are ledger-only in this mode)
  - `SELECT state, count(*) FROM notification_delivery GROUP BY 1;` → rows in `CREATED` (decision-only)
  - `SELECT state, count(*) FROM followup_threads GROUP BY 1;` → threads advancing
- [ ] Confirm **no** provider traffic (WhatsApp/Email dashboards show nothing)

---

## Phase 5 — Real send to ONE test customer

- [ ] Pick/create a **test customer** whose contact details are yours (a phone/inbox you control), with `CustomerContactChannel` rows `OPTED_IN` (WhatsApp E.164 without `+`, and/or email)
- [ ] Enable routing for the **test tenant only**: `POST /workflow-engine/features/channel-routing {"enabled": true}` (admin)
- [ ] Trigger a dunning step for the test customer's overdue invoice (sweep, or a targeted event)
- [ ] Verify the real send:
  - `notification_delivery.state` → `SENT`, `provider_message_id` populated
  - `notification_timeline` has a `SENT` row; `workflow_decision_logs` shows outcome `SENT`
  - Metric `workflow_dispatch_total{result="sent"}` increments (`/metrics`)
  - You actually receive the message
- [ ] Verify the **status webhook**: POST a signed `delivery-status` (delivered/read) and confirm the ledger advances to `DELIVERED`/`READ`
- [ ] Verify **quiet-hours defer** (send during 21:00–08:00 IST → job delayed) and **batching** (multiple low-priority steps for one customer → a single digest via `dispatch_batch_items`)

---

## Phase 6 — Optional: graph execution & intelligence (test tenant)

- [ ] `POST /workflow-engine/features/graph-execution {"enabled": true}` → the sweep now advances this tenant via the workflow graph (`followup_threads.current_node_id` moves). Confirm the ladder path is skipped for it (no double-processing).
- [ ] `predictive-ai`, `ai-advisor`, `optimizer` flags as desired; verify `/predictive/*`, `/optimizer/recommendations`, assistant proposals (`/assistant/*`, human approval required).

---

## Phase 7 — Soak on staging

- [ ] Run for **≥ 48h** with the test tenant live
- [ ] Watch: `workflow_dispatch_total` (sent vs failed ratio), delivery funnel, `followup_threads` reaching `RESOLVED`, no stuck `ACTIVE` threads past `next_action_at` (dead-workflow recovery should re-arm/escalate), Redis `wf:*` key growth bounded, no error-log spikes
- [ ] Confirm dedup: no duplicate sends for the same invoice+tone+day

---

## Phase 8 — Production rollout

- [ ] Reconcile prod migration history if needed (Appendix A), then deploy `main` to prod via `deploy.yml`
- [ ] Confirm all 5 migrations applied + post-verify passed on prod
- [ ] Boot/smoke (Phase 2) against `:3001`
- [ ] Set prod secrets (Phase 3); **keep all send-flags OFF**
- [ ] Enable **for one pilot prod tenant** in ledger-only → real-send to a controlled customer → soak → then widen tenant by tenant
- [ ] `DUNNING_ENABLED=true` on prod only after a pilot tenant is validated

---

## Rollback (any phase, fast & reversible)

- **Stop sends immediately:** `POST /workflow-engine/features/channel-routing {"enabled": false}` (per tenant) → senders revert to ledger-only. Effect is immediate (cache TTL ≤ 30s; write invalidates).
- **Stop the sweep:** `DUNNING_ENABLED=false` → restart pm2.
- **Revert graph execution:** `graph-execution` flag off → tenant returns to the ladder.
- **Bad deploy:** `scripts/deploy.sh` auto-rolls back source+dist on failed health check. Migrations are **additive/forward-only** and RLS policies are **null-allowing** (safe to leave); no destructive down-migration needed.
- **Redis outage:** dedup/flag/policy stores **fail open** (no blocked delivery; bounded staleness) — no action needed, but investigate.

---

## Appendix A — Migration history reconciliation

> **Authoritative, verified detail: [PR #10 — DBA review audit of failed Prisma migrations](https://github.com/Tharun-code-08/Inventory-control/pull/10)** (`docs/workflow-engine/FAILED-MIGRATIONS-RECONCILIATION.md`). It supersedes the high-level notes below with per-row verdicts checked against git history, migration SQL, `schema.prisma`, app code, and the live DBs. Notably it found **prod is affected too** (3 failed rows, not just staging's 6), and corrects the branding-columns row to **`resolve --applied`** (do *not* roll back — later applied migrations re-add those columns).

`prisma migrate status` on both DBs shows failed `_prisma_migrations` rows (finished_at NULL) — recorded migrations absent from the repo (incl. duplicate `20260712130000_step1_rls_tenant_isolation_schema` ×3 on staging) and an orphaned/differently-named eway-bill migration. Do **not** hand-run `migrate deploy` into this state (P3009).

Reconcile first (DBA-supervised), e.g.:
1. Snapshot the DB.
2. Compare `_prisma_migrations` vs `apps/api/prisma/migrations/`; for records that are already reflected in the schema but mis-named, use `prisma migrate resolve --applied <name>` / `--rolled-back <name>` to align bookkeeping, or delete the duplicate `_prisma_migrations` rows.
3. Re-run `prisma migrate status` until "Database schema is up to date" except for the 5 new pending migrations.
4. Then let the pipeline apply them.

## Appendix B — Key config reference

| Item | Where | Purpose |
|---|---|---|
| `DUNNING_ENABLED` | env | registers the daily dunning sweep (needs restart) |
| `channel-routing` | per-tenant flag | off ⇒ ledger-only; on ⇒ real WhatsApp/Email sends |
| `graph-execution` | per-tenant flag | tenant runs on the workflow graph vs the ladder |
| `ai-advisor`/`predictive-ai`/`optimizer`/`simulation` | per-tenant flags | intelligence features |
| `WHATSAPP_DUNNING_TEMPLATE*`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | env | WhatsApp transport (approved template required) |
| verified primary `EmailSenderIdentity` + SMTP | tenant DB config | Email transport |
| `DISPATCH_WEBHOOK_SECRET` | env | HMAC for `/workflow-engine/webhooks/delivery-status` |
| `WORKFLOW_FLAG_<NAME>` | env | global flag default (per-tenant overrides win) |

## Appendix C — Verification queries

```sql
-- Decisions (explainability)
SELECT outcome, channel, count(*) FROM workflow_decision_logs
  WHERE created_at > now() - interval '1 day' GROUP BY 1,2 ORDER BY 3 DESC;
-- Delivery ledger state
SELECT channel, state, count(*) FROM notification_delivery GROUP BY 1,2;
-- Thread progression
SELECT state, count(*) FROM followup_threads GROUP BY 1;
-- Batching
SELECT status, count(*) FROM dispatch_batch_items GROUP BY 1;
-- CRM activity written by crm.update
SELECT type, count(*) FROM customer_activities GROUP BY 1;
```

Metrics (`GET /metrics`): `workflow_dispatch_total{channel,result}`, `notification_deliveries_total{channel,outcome}`, `notification_engine_duration_seconds`.
