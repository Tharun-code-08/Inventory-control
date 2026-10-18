# Failed Prisma Migrations — Reconciliation Audit (Prod + Staging)

**Date:** 2026-08-02
**Method:** Read-only. Only `SELECT` / information_schema / `pg_type` queries were run against the live databases. **No** `migrate deploy`, `db push`, `resolve`, or DML was executed. Nothing was mutated.
**Purpose:** Step 2 of the migration-history reconciliation ("audit every failed migration against the actual schema"). This document classifies each failed `_prisma_migrations` record and proposes a per-row resolution for a DBA to execute **after a backup**.

> ⚠️ This is an analysis, not an executable script. Every command below mutates a production/staging database and must be run by someone with DB authority, with a fresh backup in hand, and reviewed against the notes.

> **Status: DBA review document — NOT an automatic execution plan.** The commands here are proposals to be approved and carried out by whoever owns the production database, after backup and validation. Nothing here should be run unattended.

> **Fact vs. recommendation.** Items marked **[VERIFIED]** were checked against git history, migration SQL, `schema.prisma`, app code, and the live `information_schema`. Items marked **[HYPOTHESIS]** are plausible but unconfirmed (would need logs / a runtime observation). Items marked **[RECOMMENDATION]** are engineering judgment that still needs the DBA's own review (incl. a restore-from-backup rehearsal). An earlier draft of this doc over-stated two things that verification later corrected — see §3 Row C and Row D.

---

## 1. Why deploys are currently blocked

`prisma migrate deploy` aborts (P3009) the moment it finds a migration row with `finished_at IS NULL` ("failed") in the target DB. Both environments have such rows, so **no deploy can reach application startup** until they are cleared.

| Env | Total rows | Failed rows |
|---|---|---|
| Production (`retail_ims`) | 101 | **3** |
| Staging (`staging_retail_ims`) | 108 | **6** |

The failed rows are **legacy lineage artifacts**, not caused by PR #7. Two of the names no longer have a migration folder in the repo. Note the two cases differ (see §3):
- **eway tables** — the relevant table is re-created by a committed, applied successor (`add_eway_bills`) — **verified**.
- **RLS (`step1_rls…`)** — **no successor link is provable from this repo's git history**; RLS is independently active via committed migrations, but "superseded by" is **not** established. Clearing its orphan rows is safe for unblocking deploy, which is a separate claim from RLS correctness.

---

## 2. The failed rows

| Migration name | Prod | Staging | Folder in repo? | Replacement / owning migration |
|---|:--:|:--:|:--:|---|
| `20260617090000_add_eway_bill_tables` | ✗ | ✗ | **No** (removed) | table re-created by applied `20260616120000_add_eway_bills` — **verified** |
| `20260617100000_add_eway_bill_columns` | ✗ | ✗ | Yes | — (still the owning migration) |
| `20260618000003_remove_branding_version_columns` | ✗ | ✗ | Yes | — (still the owning migration) |
| `20260712130000_step1_rls_tenant_isolation_schema` | — | ✗ ✗ ✗ (×3) | **No** (removed) | **no provable successor in this repo** (see Row B); RLS active via applied `rls_phase1` + `force_rls_tenant_tables` |

`schema_reconstruction`, `add_eway_bills`, `rls_phase1`, `force_rls_tenant_tables` are all **applied (finished)** in both DBs — verified. (The last column asserts a *replacement* relationship only where git history proves it; for the RLS row it does not.)

---

## 3. Per-row verdict

### Row A — `20260617090000_add_eway_bill_tables`  (prod + staging)
- **[VERIFIED] Folder:** gone — deleted in commit `def1aa35` ("Fix API global prefix and Vercel API rewrite"), which was a **bulk migration-tree reorg** (added 500+ lines across many migration files), *not* a clean targeted supersession. Treat the history as "wholesale rewrite," not a 1:1 rename.
- **[VERIFIED] `eway_bills` table exists** and is created by committed, applied migration `20260616120000_add_eway_bills` (added in commit `d039b73d`; its SQL does `CREATE TABLE "eway_bills"` with PK/indexes/FKs).
- **[VERIFIED] Verdict:** clear the record. `--applied` is impossible (no folder), so `--rolled-back`. Because the folder is gone, `migrate deploy` will **not** try to re-run it — so this only clears the stale row.
- **Command (both envs):**
  ```
  npx prisma migrate resolve --rolled-back 20260617090000_add_eway_bill_tables
  ```
- **Risk:** none — no schema change; only the bookkeeping row is updated.

### Row B — `20260712130000_step1_rls_tenant_isolation_schema`  (staging only, ×3)
- **[VERIFIED] Folder:** gone — and stronger: **this migration name has NO git history in any local ref**; it appears only inside prior doc files. So I **cannot prove** it was "superseded by" any specific migration. What IS verifiable: the 3 failed rows are **orphans with no repo counterpart**, and RLS is *currently* active via the independently-committed, applied `rls_phase1` + `force_rls_tenant_tables`. (Whether the RLS `step1_rls` intended equals what those provide is **unverifiable** here — its SQL doesn't exist in the repo.)
- **[VERIFIED] Verdict for unblocking deploy:** clearing the 3 orphan rows is safe *for the purpose of unblocking `migrate deploy`* — there is no folder to re-run, so no schema change occurs. It does **not** by itself prove RLS correctness (verify that separately via the RLS/drift checks).
- **[RECOMMENDATION] Prefer the Prisma-supported path first; treat direct DML as a fallback.** `_prisma_migrations` is Prisma's bookkeeping table — direct modification should be performed **only after DBA review and only when no appropriate Prisma-supported reconciliation path exists**. Order of preference:
  1. Try `npx prisma migrate resolve --rolled-back 20260712130000_step1_rls_tenant_isolation_schema` (the supported way to clear a failed record). It may not cleanly handle **3 duplicate rows** of the same name — check what it does on the restored backup.
  2. **Only if** `resolve` cannot clear all three, fall back to a targeted delete (on the restored backup first, then staging), verifying the count before deleting:
  ```sql
  -- staging only; verify it returns exactly 3 before deleting
  SELECT id, started_at FROM _prisma_migrations
   WHERE migration_name = '20260712130000_step1_rls_tenant_isolation_schema' AND finished_at IS NULL;
  DELETE FROM _prisma_migrations
   WHERE migration_name = '20260712130000_step1_rls_tenant_isolation_schema' AND finished_at IS NULL;
  ```
- **Risk:** none to schema — RLS already active via successors; only stale rows removed. The choice of mechanism (resolve vs. DML) is the reviewed decision.

### Row C — `20260617100000_add_eway_bill_columns`  (prod + staging)  — *importance upgraded*
- **[VERIFIED] Folder:** present. **State:** enums (`EwaySubType`…) exist, but `eway_bills.doc_type`, `sub_type`, `transaction_type`, `vehicle_type`, the address columns, `customer_id`, `sales_order_id`, and the `eway_bill_items` table are **missing** (0 applied steps).
- **[VERIFIED] This is a live client↔DB mismatch, not cosmetic:** `schema.prisma`'s `EwayBill` model **declares** these fields (`subType`, `transactionType`, `vehicleType`, `fromAddress1/2`, `customerId`, `salesOrderId`, …), while the DB lacks the columns.
- **[HYPOTHESIS — not observed]** The current schema mismatch is **expected to cause runtime failures for EwayBill operations if those fields are queried** (the generated client would `SELECT sub_type, …` against non-existent columns). This has **not** been confirmed against a failing query or prod logs — verify via logs / a read-only query before asserting the feature is down. Regardless of current impact, re-applying this migration is a **correctness fix** (aligns the DB with the model), not just cleanup.
- **[VERIFIED] Body is idempotent + additive:** `ADD COLUMN IF NOT EXISTS` (all nullable/defaulted), enum `ALTER … TYPE` in an exception-swallowing block, `CREATE TABLE/INDEX IF NOT EXISTS`. Safe to re-run; folder present so `--rolled-back` makes deploy re-run it.
- **Verdict:** `--rolled-back` so the next deploy re-applies and completes the eway schema:
  ```
  npx prisma migrate resolve --rolled-back 20260617100000_add_eway_bill_columns
  # then the normal `prisma migrate deploy` re-runs it
  ```
- **Risk:** low (additive/nullable). **[RECOMMENDATION]** before running, confirm the eway service is expected to work in prod (it may be currently failing) and rehearse on the restored backup. Back up first.

### Row D — `20260618000003_remove_branding_version_columns`  (prod + staging)  — ⚠️ EARLIER VERDICT CORRECTED
- **[VERIFIED] The columns are present *by design of the later lineage*, not simple drift.** This June migration drops `branding_version` from the header tables, but **later, applied migrations RE-ADD it**: `20260703120000_workflow_e2e_master_tables` and `20260711130000_product_images` both `ADD COLUMN IF NOT EXISTS "branding_version"` on `sales_quote_header`, `invoice_header`, `payment_receipts`, etc. So the committed lineage's *net intended state is that headers HAVE `branding_version`.*
- **[VERIFIED mechanics → derived conclusion]** Based on the currently verified migration lineage, using `--rolled-back` would cause Prisma to **re-run this migration's drop** while the later re-add migrations would **not** execute again (they are already applied). Unless additional migration history exists outside this repository, this would leave the schema **inconsistent with the applied migration lineage**. On that basis the recommendation is **do not roll this back** (this reverses my earlier "Option B"). *The mechanics are verified; "do not roll back" is the engineering conclusion drawn from them.*
- **[VERIFIED] `branding_profiles.branding_version` is legitimate** (declared on `BrandingProfile`, schema.prisma:418) and untouched by this migration. **[VERIFIED] No app code references header `branding_version`** (0 raw refs in `apps/api/src`; the Prisma client can't see it because header models don't declare it — so the columns are inert to the ORM).
- **Separating fact from recommendation here:**
  - **[VERIFIED fact]** the header columns are present by design of the later lineage, and `--rolled-back` would re-run the drop → inconsistent with applied migrations (so *not* rolling back is established, not a preference).
  - **[RECOMMENDATION — reconciliation, not an unquestionable fact]** *which* forward action to record is a judgment call; `--applied` is the recommended reconciliation, pending DBA review.
- **[RECOMMENDATION] Verdict:** mark **applied** (do **not** drop):
  ```
  npx prisma migrate resolve --applied 20260618000003_remove_branding_version_columns
  ```
  This records the failed step as done without executing the (now-obsolete) drop, leaving the header `branding_version` columns in place — consistent with the July re-add migrations.
  **This recommendation is not self-executing; require ALL of the following first:** (a) successful backup, (b) restore rehearsal where this exact command is run and `migrate status` verified clean, (c) DBA review, and (d) a re-confirmation that no migration *after* `20260711130000` assumes these columns were dropped (checked as of this audit — none do, but re-check at execution time in case new migrations landed).
- **Residual, SEPARATE issue (not fixed by this row):** `schema.prisma` header models don't declare `branding_version`, yet migrations+DB have it → a **Category-C schema↔model drift**. That is its own reconciliation task (either add the field to the models, or write a *new* forward migration that drops it **and** update `schema.prisma` together). It must **not** be conflated with resolving this failed row.
- **Risk:** `--applied` = none (no schema change). `--rolled-back` = **not recommended** — per the verified mechanics above, it would re-run the drop and leave the schema inconsistent with the applied lineage (barring migration history outside this repo).

---

## 4. Recommended execution order (per environment, after backup)

1. **Back up the database** (both envs, independently) **and rehearse the whole sequence on the restored backup first.**
2. Clear orphaned records (no folder → no re-run): **Row A** (`--rolled-back`), and on staging **Row B** (SQL delete ×3).
3. **Row D** → `--applied` (mark done, **no drop**; folder present, so per the verified mechanics in §3 Row D, `--rolled-back` would re-run the drop and diverge from the applied lineage — hence not recommended).
4. **Row C** → `--rolled-back` (folder present → re-runs on deploy to complete the eway columns; this aligns the DB with the `EwayBill` model and, per the §3 Row C hypothesis, would resolve the mismatch that is *expected* to fail EwayBill queries — confirm impact via logs).
5. `npx prisma migrate status` → must report **no failed / no pending-failed**.
6. `npx prisma migrate deploy` → re-applies **Row C** + any genuinely pending migrations. (Row A/B/D do **not** re-run.)
7. Verify: eway columns present; EwayBill queries succeed; `migrate status` clean; app boots; smoke test.

> The residual header-`branding_version` schema↔model drift (§3 Row D) is **out of scope** for this failed-row reconciliation and should be handled as its own reviewed change.

Only after **staging** is clean + deployed + smoke/E2E/soak-tested should the same reconciliation be applied to **production**.

---

## 5. Environment fact-check (as observed, read-only)

- Prod & staging are **identical** for these rows: enums exist, `doc_type` absent, `branding_version` present on the same 12 tables.
- Superseding migrations (`add_eway_bills`, `rls_phase1`, `force_rls_tenant_tables`, `schema_reconstruction`) are **applied** in both.
- PR #7's 5 migrations are **not yet present** on either DB (expected — PR #7 is unmerged). This reconciliation is **independent** of PR #7 and unblocks *any* future deploy.

---

## 6. Verification log (what was actually checked, read-only)

- **Git history:** `add_eway_bill_tables` deleted in `def1aa35` (bulk reorg); `add_eway_bills` added in `d039b73d` and does `CREATE TABLE eway_bills`. `step1_rls_tenant_isolation_schema` has **no git history** in any local ref (name appears only in prior docs).
- **Migration SQL:** read `add_eway_bill_columns` (idempotent/additive) and `remove_branding_version_columns` (guarded drops); found `20260703120000` + `20260711130000` **re-add** `branding_version` to header tables *after* the drop.
- **`schema.prisma`:** `EwayBill` declares the missing eway columns; `brandingVersion` declared once (BrandingProfile only), not on header models.
- **App code:** `grep apps/api/src` → **0** raw references to header `branding_version`.
- **Live DBs (both):** enums exist, `eway_bills.doc_type` absent, `branding_version` present on 12 tables; superseding migrations (`add_eway_bills`, `rls_phase1`, `force_rls_tenant_tables`, `schema_reconstruction`) all applied.
- **NOT done (DBA-owned):** backup, restore-rehearsal, and executing any `resolve`/DML.
