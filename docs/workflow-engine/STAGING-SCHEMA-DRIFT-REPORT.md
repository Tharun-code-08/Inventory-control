# Staging Schema Drift Report (read-only diagnostic)

**Generated:** 2026-07-30 · **Read-only** — no database was modified.
**Compared:** live `staging_retail_ims` DB  ⟷  `apps/api/prisma/schema.prisma` (== `origin/main` schema + PR #7's 10 new models).
**Full drift SQL:** [`staging-schema-drift.sql`](./staging-schema-drift.sql) (645 lines).

> ⚠️ **Do not run `prisma migrate deploy`, `migrate dev`, or `db push` against staging until this is reconciled.** Deploy will fail (see below), and a `db push`/`migrate dev` would DROP columns/tables that hold data.

---

## TL;DR

Staging is **not** a clean copy of `main`. It is in a **partially-migrated, corrupted state** with **failed migrations** left half-applied. This **predates PR #7** and is an infrastructure/DBA problem, not a code problem. PR #7's own migrations are clean and additive; they cannot be deployed until staging's migration history is repaired.

**`migrate deploy` will refuse to run at all** — Prisma hard-errors when `_prisma_migrations` contains failed entries (there are 6).

---

## 1. Migration bookkeeping (`_prisma_migrations`) — the root cause

- **108** total migration records.
- **6 FAILED / unfinished** (`finished_at IS NULL`) — Prisma treats these as blocking:
  - `20260617090000_add_eway_bill_tables`
  - `20260617100000_add_eway_bill_columns`
  - `20260618000003_remove_branding_version_columns`
  - `20260712130000_step1_rls_tenant_isolation_schema` ×3
- **Duplicate `migration_name` rows** (a migration should appear once):
  - `20260712130000_step1_rls_tenant_isolation_schema` ×4
  - `20260617100000_add_eway_bill_columns` ×2
  - `20260618000003_remove_branding_version_columns` ×2
- Several of these migration **names do not exist in the repo** (`apps/api/prisma/migrations/`) — they are from an **abandoned lineage** that was deployed to staging but later renamed/replaced on `main` (e.g. repo has `rls_phase1` / `force_rls_tenant_tables`, staging recorded `step1_rls_tenant_isolation_schema`).

**Interpretation:** migrations were run against staging, failed mid-way, were retried (hence duplicates), and left the schema partially transformed. The failed `remove_branding_version_columns` is why staging still carries `branding_version` columns that `main` expects removed.

---

## 2. Schema drift (structural)

The full SQL to transform **staging → `main` schema** is 645 lines. Categorized:

### Tables only in `main`, absent in staging (3 genuine)
- `user_devices`, `notification_subscriptions`, `low_stock_alerts`

> (The diff also lists 10 more `CREATE TABLE`s — `recipient_engagements`, `notification_policies`, `workflow_graphs`, `workflow_versions`, `workflow_nodes`, `notification_timeline`, `ai_memory`, `assistant_actions`, `dispatch_batch_items`, `customer_activities` — these are **PR #7's own pending migrations**, expected, *not* drift.)

### Tables only in staging, absent in `main` (3)
- `platform_audit_log`, `stock_reservations`, `user_consents`

### Columns only in staging (34 `DROP COLUMN` in the diff)
- `branding_version` (~10 document tables), `tenant_id` (products, stock_ledger, inventory_lots, purchase/sales items, …), `reserved_qty`, `so_line_id`, `lot_id`, `reversed_by`, …

### Columns only in `main` (6 `ADD COLUMN`)
### Enum retypes (3)
- e.g. `audit_logs.action` → `AuditAction_new`

**Interpretation:** staging carries whole features (`stock_reservations`, `user_consents`, `tenant_id`-based RLS, `branding_version`, `platform_audit_log`) that `main` does not, and lacks features `main` has. Staging and `main` are on **divergent lineages** — likely staging was deployed from a branch that was never merged (or was force-reset) on `main`.

---

## 3. The decision this report unblocks

**Which schema is the source of truth?** A human/DBA must decide:

- **If `main` is canonical** (staging is a stale experiment): rebuild the staging DB from `main`'s migrations (restore/reset staging, then `migrate deploy` the full repo history), accepting loss of staging-only data.
- **If staging's schema is canonical** (it has real features `main` lost): `main` must catch up — port the missing migrations (`stock_reservations`, `user_consents`, `tenant_id` RLS, `branding_version`) into the repo before anything is deployed.
- **Most likely reality:** a mix — reconcile per-feature. This needs the person who knows *how staging came to differ from `main`*.

Either way: **take a full DB backup first**, then repair `_prisma_migrations` (resolve/remove the 6 failed + duplicate rows via `prisma migrate resolve` after verifying, per migration, whether its change actually applied), then re-run `migrate status` until only PR #7's 5 migrations are pending.

---

## 4. Where PR #7 stands

PR #7 is **independent of this problem**. Its 5 migrations are additive (new tables + RLS) and clean. They will apply without issue **once staging's migration history is repaired and re-aligned with `main`**. Nothing in PR #7 caused or worsens this drift. It is safe to review/merge to `main`; it must not drive a **staging** deploy until Section 3 is resolved.

---

## 5. What NOT to do

- ❌ `prisma migrate deploy` on staging (fails on the 6 failed migrations).
- ❌ `prisma db push` / `migrate dev` on staging (would DROP `branding_version`, `tenant_id`, `stock_reservations`, `user_consents`, … → **data loss**).
- ❌ Blindly `DELETE FROM _prisma_migrations` — resolve each failed/duplicate row deliberately, with a backup, after confirming actual schema state.
- ❌ Treat this as a code task — it is infrastructure/DBA work.
