# Schema↔Migrations Reconciliation — Category C/D Decisions

**Status: DECISION-REQUIRED DRAFT. Do NOT merge the destructive parts until each decision below is made and audited.**
Read-only analysis on throwaway DBs; nothing real was touched. Companion to `SCHEMA-RECONCILIATION-ANALYSIS.md`.

This PR ships **one safe, tested migration** (Category D *additive* enum values — see `20260731010000_reconcile_cd_additive_enums`) and this **decision doc** for everything that is destructive or needs a human/product decision. Category B is handled separately in the additive PR.

---

## Category D — enums (reliable deltas, verified on a fresh `origin/main` DB; no `@map`)

| Enum | schema-only (app writes → DB rejects) → **ADD (safe)** | DB-only (rows may use these) → **decision** |
|------|--------------------------------------------------------|---------------------------------------------|
| EwayDocumentType | `BILL_OF_ENTRY`, `OTHERS` ✅ (in this PR's migration) | `DEBIT_NOTE` |
| EwayTransactionType | `BILL_TO_SHIP_TO`, `BILL_FROM_DISPATCH_FROM`, `COMBINATION` ✅ | `AMENDMENT`, `REVERSAL` |
| EwayVehicleType | `ODC` ✅ | `EXEMPTED`, `ODD_EVEN` |
| AuditAction | (none) | `EMAIL`, `EXPORT` |

**DB-only values are the decision.** Postgres cannot `DROP` an enum value — removing one requires recreating the type (destructive retype) and first migrating any rows that use it. Also note: if a row already stores a DB-only value and `schema.prisma` omits it, the **Prisma client fails to deserialize that row**.

**Recommended (safe) direction — UNION, non-destructive:**
- ADD the schema-only values to the DB (done, this PR's migration), **and**
- ADD the DB-only values to `schema.prisma` (make the client aware) instead of removing them.

Only pursue removal (retype) if a value is confirmed unused *and* cleanliness is worth a destructive migration.

**Audit before any removal (per environment):**
```sql
-- Are any rows using the DB-only value? (repeat per enum/column)
SELECT count(*) FROM audit_logs           WHERE action IN ('EMAIL','EXPORT');
SELECT count(*) FROM eway_bills            WHERE document_type = 'DEBIT_NOTE';
SELECT count(*) FROM eway_bills            WHERE transaction_type IN ('AMENDMENT','REVERSAL');
SELECT count(*) FROM eway_bills            WHERE vehicle_type IN ('EXEMPTED','ODD_EVEN');
```

---

## Category C — orphan objects (migrations create them; `schema.prisma` does NOT declare them)

Prisma's client is unaware of these; its diff wants to **DROP** them → **data loss** if applied blind.

### Tables
| Table | Decision | Audit |
|-------|----------|-------|
| `platform_audit_log` | keep → add model to `schema.prisma`; **or** drop (if dead) | `SELECT count(*) FROM platform_audit_log;` + `grep -ri platform_audit apps/api/src` |
| `supplier_bank_accounts` | keep → add model; **or** drop | `SELECT count(*) FROM supplier_bank_accounts;` + code grep |
| `supplier_contacts` | keep → add model; **or** drop | `SELECT count(*) FROM supplier_contacts;` + code grep |

### Columns
| Table.column | Decision | Notes |
|--------------|----------|-------|
| `invoice_header.branding_version`, `payment_receipts.branding_version`, `sales_order_header.branding_version`, `sales_quote_header.branding_version` | drop (a `remove_branding_version_columns` migration exists but failed on staging) — **or** re-add to schema | confirm no reads: `grep -ri branding_version apps/api/src` |
| `eway_bills.from_address`, `eway_bills.to_address`, `eway_bills.hsn_summary` | keep → add to schema; **or** drop | check data + code usage |

### Candidate SQL (choose ONE direction per object; DO NOT run blind)
```sql
-- KEEP direction: declare in schema.prisma, then `prisma migrate dev` generates a no-op/aligning migration.
--   (preferred when the object is real/used — non-destructive)

-- DROP direction (DESTRUCTIVE — backup first, confirm zero data + zero code refs):
-- DROP TABLE "platform_audit_log";
-- DROP TABLE "supplier_bank_accounts";
-- DROP TABLE "supplier_contacts";
-- ALTER TABLE "invoice_header"     DROP COLUMN "branding_version";
-- ALTER TABLE "payment_receipts"   DROP COLUMN "branding_version";
-- ALTER TABLE "sales_order_header" DROP COLUMN "branding_version";
-- ALTER TABLE "sales_quote_header" DROP COLUMN "branding_version";
```

---

## Recommended process
1. Merge the **additive enum migration** in this PR (safe, tested, closes the write-rejection risk).
2. For each Category C object and each DB-only enum value: run the audit query (per env), decide **keep** (add to `schema.prisma`) or **drop** (destructive, backup first).
3. Implement the chosen direction as `schema.prisma` edits + Prisma-generated migrations, in a follow-up, DBA-reviewed.
4. Re-run `migrate diff --from-migrations → --to-schema-datasource` (shadow) until clean.

**Do not auto-apply the destructive candidates. Do not bundle into the workflow-engine RC.**
