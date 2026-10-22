# Workflow / Notification Engine — Staging Runbook

Handoff for deploying the Workflow & Notification Engine (Phase 1) and the
customer-dunning foundation (Phase 2) to **staging**, then finishing the
environment-gated wiring (Task #9).

> **Environments**
> - staging → `/opt/Inventory-control-staging`, pm2 `retail-ims-staging`, port `:3000`, DB `staging_retail_ims`, redis `:6380`, branch `develop`
> - prod → `/opt/Inventory-control-prod`, pm2 `retail-ims-prod`, port `:3001`, DB `retail_ims`, redis `:6379`
>
> **Do all of this on staging first.** Never run `test:e2e` on a deployed host (it writes to the live DB). Never `npm run build` inside the prod web root.

---

## 0. What is already in the code (verified offline)

Landed and unit-tested, but **not yet exercised against a DB / external providers**:

- **Phase 1 engine**: `src/common/workflow-engine/` — `WorkflowEngineConsumer` (registers on `EventBus` as `notification-engine`), `notification-rules.ts`, in-app delivery via `NotificationDelivery`, explainability `WorkflowDecisionLogService` (guarded raw SQL), metrics.
- **Producer migrated**: `GoodsReceiptsService.post()` emits `goods-receipt.created` inside its transaction; the old direct `notifyRoles` was removed.
- **Phase 2 pure core**: `dunning.ts`, `dunning-sweep.ts`, `dunning-delivery.ts` (+ specs) — ladder FSM, stop-on-payment/reply, consent gating, channel fallback, prioritisation. **No DB wiring yet.**
- **Staged migrations** (present, **not applied**): `20260730120000_workflow_decision_log`, `20260730130000_customer_dunning`.
- **New event contracts** registered: `invoice.dunning-step`, `invoice.paid`, `customer.replied`.

---

## 1. Pre-deploy checks (on staging checkout)

```bash
cd /opt/Inventory-control-staging
git fetch && git checkout develop && git pull        # bring in this work
cd apps/api
npx prisma validate                                  # schema is valid
# Confirm exactly the two new migrations are pending, nothing destructive:
npx prisma migrate status
```

Expected pending migrations: `20260730120000_workflow_decision_log`,
`20260730130000_customer_dunning`. If `migrate status` and `migrate diff`
disagree, trust `prisma migrate diff` (see `prod-schema-drift-503-fix`).

```bash
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --exit-code            # exit 0 = no drift between migrations and schema
```

---

## 2. Deploy to staging

The standard pipeline handles ordering correctly — `scripts/deploy.sh` runs
`prisma migrate deploy` (step `prisma-migrate`) **before** restarting the app,
so new tables exist before any code queries them:

```bash
cd /opt/Inventory-control-staging
./scripts/deploy.sh staging          # migrate deploy → build → prisma generate → pm2 restart
./scripts/verify-deployment.sh staging
```

If deploying manually instead of via the script, keep this order:

```bash
cd apps/api
npx prisma migrate deploy            # 1. apply migrations FIRST
npm run prisma:generate              # 2. regenerate client (picks up new models)
# 3. build + pm2 restart retail-ims-staging
```

> The decision-log write is guarded raw SQL, so even if step order slips the app
> will not 503 — it just warns and drops decision rows until the table exists.
> The two new tables are additive (no FKs, no column changes), so this migration
> is low-risk and reversible.

---

## 3. Verify the migration landed

```sql
-- Tables exist
\d workflow_decision_logs
\d customer_contact_channels
\d followup_threads

-- Indexes exist (spot check)
SELECT indexname FROM pg_indexes
WHERE tablename IN ('workflow_decision_logs','customer_contact_channels','followup_threads')
ORDER BY 1;
```

---

## 4. Smoke test Phase 1 (in-app engine, no external deps)

1. Log in to the staging app; ensure the test company has users with roles
   `OWNER / ADMIN / INVENTORY_MANAGER / PURCHASE_MANAGER` (recipients of GR).
2. Create a goods receipt, then **Post** it.
3. Confirm the team sees the in-app **"Goods Received"** notification (deep link
   `/goods-receipts/{id}`) — now delivered via the engine, not the old path.
4. Verify the ledger + decision log + relay:

```sql
-- The event was emitted and relayed
SELECT event_type, status, retry_count FROM outbox_events
WHERE event_type='goods-receipt.created' ORDER BY created_at DESC LIMIT 1;

-- One delivery row per recipient, IN_APP / DELIVERED
SELECT channel, state, count(*) FROM notification_deliveries
WHERE created_at > now() - interval '10 minutes' GROUP BY 1,2;

-- Explainability rows
SELECT event_type, channel, outcome, reason FROM workflow_decision_logs
ORDER BY created_at DESC LIMIT 10;
```

5. Check metrics on `:3000/metrics`:

```
notification_deliveries_total{channel="IN_APP",outcome="DELIVERED"}
notification_engine_duration_seconds_count{event_type="goods-receipt.created",status="success"}
```

**Pass criteria:** in-app notification appears once per recipient, `outbox_events`
row is `ACKNOWLEDGED`, `notification_deliveries` has matching `DELIVERED` rows,
`workflow_decision_logs` has `DELIVERED` rows, and the counters increment. No
duplicate notifications (the old `notifyRoles` path is gone).

---

## 5. Finish Task #9 (dunning wiring — build on staging)

All decisions already live in tested pure functions; these are thin adapters.

1. **Repository** (`dunning.repository.ts`) — typed Prisma now that the client is
   regenerated:
   - load `DunningCandidate[]`: `InvoiceHeader` where `status IN (ISSUED,
     PARTIALLY_PAID)` and `dueDate` not null, join `Customer`,
     `CustomerContactChannel` (→ `consent`), existing `FollowupThread`, and
     inbound `Message` for `customerReplied`.
   - persist `ThreadOp[]` via `followup_threads` upsert on `(entity_type, entity_id)`.
2. **Sweep scheduler** (BullMQ repeatable, mirror `PaymentReminderScheduler`) —
   calls `planDunningSweep(candidates, new Date())`, persists `threadOps`, and
   for each `send` emits `invoice.dunning-step` via `OutboxService.emit`. Gate
   behind an env flag (e.g. `DUNNING_ENABLED=false` by default).
3. **Demote `PaymentReminderProcessor`** to run alongside (or be replaced by) the
   sweep — keep it behind its existing flag until the engine path is proven.
4. **Engine consumer branch** for `invoice.dunning-step`: call
   `planDunningDelivery(payload)`, then execute `attempts` in order via the
   channel adapters, using `nextFallback` on failure; write `NotificationDelivery`
   + `WorkflowDecisionLog` rows per attempt.
5. **Lifecycle emitters + handlers**:
   - emit `invoice.paid` from the payment-receipt path when balance hits 0;
   - emit `customer.replied` from `WhatsAppWebhookController` inbound;
   - consumer applies `reduceThreadOnLifecycle(...)` to pause/resolve threads.
6. **Consent opt-in flow** — a small controller + state machine writing
   `CustomerContactChannel.consentState` (`PENDING → OPTED_IN/OPTED_OUT`).

> Keep `DUNNING_ENABLED=false` on staging until Meta templates are approved
> (§6). With it off, sweeps plan and log but emit no customer sends.

---

## 6. WhatsApp templates (external dependency — blocks customer sends)

Customer WhatsApp reminders are outside the 24h service window, so each dunning
step needs a **Meta-approved template**:

1. In Meta Business Manager, submit templates for the customer steps
   (`friendly`, `reminder`, `firm`, `final`) with body params for customer name,
   invoice number, amount, due date.
2. On approval, store each template name in
   `NotificationTemplate.waTemplateName` (with `waLanguage`) for the tenant.
3. Only then flip `DUNNING_ENABLED=true` on staging and smoke a real customer
   send to an **opted-in test customer** you control.

Until approved, the email channel can carry customer reminders (email needs no
template); WhatsApp attempts will fall back to email via `nextFallback`.

---

## 7. Phase 2 smoke (once §5–6 done, on staging)

1. Create an invoice for an opted-in test customer, due today; run the sweep.
2. Confirm `invoice.dunning-step` emitted, a `followup_threads` row at
   `ladder_step=1, state=ACTIVE`, and a reminder delivered (email and/or WhatsApp).
3. Reply from the customer's WhatsApp → confirm `customer.replied` emitted and
   the thread flips to `PAUSED`.
4. Record a full payment → confirm `invoice.paid` emitted and the thread
   `RESOLVED`; no further reminders fire.

```sql
SELECT entity_id, ladder_step, state, stop_reason, next_action_at
FROM followup_threads ORDER BY updated_at DESC LIMIT 10;
```

---

## 8. Rollback

The change is additive and flag-gated:

- **Disable behaviour**: set `DUNNING_ENABLED=false` and pm2 restart — sweeps
  stop; Phase 1 in-app engine keeps working.
- **Revert code**: redeploy the previous `develop` build. The two new tables are
  harmless if left in place (nothing else references them); no down-migration
  needed. If you must drop them: `DROP TABLE followup_threads,
  customer_contact_channels, workflow_decision_logs;` (staging only).
- The engine consumer is idempotent (unique `notification_deliveries` key), so a
  relay replay after rollback cannot duplicate notifications.

---

## 9. Promote to prod

Only after staging soak: repeat §1–4 against `/opt/Inventory-control-prod`
(`./scripts/deploy.sh prod`). Keep `DUNNING_ENABLED=false` on prod until the
Phase 1 engine + Task #9 dunning path have soaked on staging and Meta templates
are approved for the prod WhatsApp number. Apply migrations before the app
restart (the deploy script already orders this correctly).
