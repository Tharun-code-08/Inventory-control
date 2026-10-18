# Schema ↔ Migrations Reconciliation Analysis (read-only)

**Generated:** 2026-07-30 · **Read-only** — produced on a throwaway DB (`we_recon`, dropped after); no staging/prod/`.env` touched.
**Candidate SQL:** [`schema-reconciliation-candidate.sql`](./schema-reconciliation-candidate.sql) (Prisma's mechanical DB→schema diff — **NOT safe to apply as-is**, see §4).

> ⚠️ This is **not** a workflow-engine issue and **not** part of PR #7. It is a pre-existing `main` repo-health problem. It should be fixed in a **separate, DBA-reviewed PR against `main`**, not bundled into the frozen RC.

---

## Headline

**`main`'s migration files do not faithfully reproduce `main`'s `schema.prisma`.** Build a fresh database purely from the repo's migrations and it diverges from what the application (the Prisma client generated from `schema.prisma`) expects — **237 diff statements**. Existing environments (staging/prod) only work because their schema was accreted through ad-hoc history — which is also *why staging is corrupted* (see STAGING-SCHEMA-DRIFT-REPORT.md). A brand-new environment deployed from the repo would be **partially broken**.

This is why WE-001's post-verify false-positived — but the underlying divergence is real and worth fixing at the source, carefully.

---

## Categories

### A — Cosmetic / safe (32) — uuid PK defaults
Migrations set DB-level `DEFAULT gen_random_uuid()`; `schema.prisma` uses app-level `@default(uuid())`. Harmless (Prisma generates the UUID client-side; the DB default is just belt-and-suspenders). 32 columns, repo-wide (10 are PR #7 tables following the same house style).
**Fix direction:** trivial either way — add `@default(dbgenerated("gen_random_uuid()"))` in `schema.prisma`, **or** a migration dropping the DB defaults. Low risk; do it repo-wide in one pass.

### B — Real: app expects it, a fresh migrate-deploy LACKS it (HIGH)
The Prisma client will reference these, but they don't exist on a clean deploy → runtime errors in a new environment.
- **Tables** (in `schema.prisma`, no migration creates them): `user_devices`, `notification_subscriptions`, `low_stock_alerts`
- **Column type mismatches** — `schema.prisma` declares enum-typed columns; migrations created them differently (e.g. text). Diff drops+re-adds:
  - `inventory_exceptions`: `type` (ExceptionType), `severity` (ExceptionSeverity), `entity_type` (EntityType), `status` (ExceptionStatus), `resolution_type` (ResolutionType)
  - `eway_bills`: `document_type` (EwayDocumentType / DocumentType)
- **Enum values** in `schema.prisma` the migrations never added (e.g. `EwaySubType` +7: JOB_WORK, SKD_CKD, RECIPIENT_NOT_KNOWN, LINE_SALES, SALES_RETURN, EXHIBITION, OTHERS) → app writes of those values would be **rejected by the DB**.
**Fix direction:** add forward migrations that create these tables / fix these column types / `ALTER TYPE … ADD VALUE`. This is the important, data-safe direction (additive).

### C — Orphan: migrations create it, `schema.prisma` does NOT declare it
Present in the DB, invisible to the client (unused, but messy). Prisma's diff wants to DROP them — **which would delete data on live environments.**
- **Tables:** `platform_audit_log`, `supplier_bank_accounts`, `supplier_contacts`
- **Columns:** `branding_version` (invoice_header, payment_receipts, sales_order_header, sales_quote_header, …), plus eway `from_address`/`to_address`/`hsn_summary`.
**Fix direction:** decide per item — either **add to `schema.prisma`** (if the feature is real and used elsewhere) or **intentionally drop** (only after confirming no data/consumers). Do **not** auto-drop.

### D — Enum retypes (4) — needs manual per-enum review
`AuditAction`, `EwayDocumentType`, `EwayTransactionType`, `EwayVehicleType` differ between DB and `schema.prisma` (value set and/or order). Postgres enum reordering is destructive (retype dance). **Characterize each enum's exact value delta by hand** before changing — a reliable diff needs proper tooling, not a grep (comments in `schema.prisma` make naive parsing unreliable).

---

## §4 — Why the candidate SQL must NOT be applied as-is

`schema-reconciliation-candidate.sql` is Prisma's DB→schema transform. Applied to a live DB it would:
- **DROP TABLE** `platform_audit_log`, `supplier_bank_accounts`, `supplier_contacts` and **DROP COLUMN** `branding_version`… → **data loss** (Category C).
- Retype enums (Category D) → destructive rewrites.

It is useful only as a **starting point for the additive direction** (Category B) and as a precise inventory of the delta. The real fix is **hand-authored forward migrations**, per category, reviewed for data safety.

---

## Recommended plan (separate PR against `main`, post-pilot or in parallel by the main/infra owner)

1. **Decide canonical direction per category** (A: either; B: add to DB; C: add-to-schema *or* drop after data check; D: per-enum).
2. Author **additive forward migrations** for Category B first (unblocks fresh-environment deploys — the real risk).
3. Resolve Category C/D deliberately with data checks.
4. Regenerate the Prisma client; confirm `migrate diff --from-migrations → --to-schema-datasource` (shadow) is clean.
5. Validate on a throwaway DB (as done here), then a rebuilt staging.

**Not for the RC. Not a blind apply. Not a workflow-engine task.**
