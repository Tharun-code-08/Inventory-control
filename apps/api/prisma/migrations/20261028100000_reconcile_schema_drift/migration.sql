-- Reconcile the database with schema.prisma (non-destructive).
--
-- A database built from these migrations differed from schema.prisma (89 items in
-- `prisma migrate diff`). Objects the app does not use but that may hold data
-- (supplier_contacts, supplier_bank_accounts, platform_audit_log, the
-- branding_version / eway from_address, to_address, hsn_summary columns and the
-- extra enum values) are now declared in schema.prisma instead of being dropped.
-- See docs/workflow-engine/SCHEMA-RECONCILIATION-CD-DECISIONS.md.
--
-- This file only changes structure the schema already declares; no table,
-- column, enum value or row is removed. Every statement is idempotent so it is
-- safe on databases whose history differs from a fresh migrate deploy.
-- The audit_logs indexes and the foreign-key validations run in the following
-- migrations so they do not hold locks while scanning large tables.

-- 1. Duplicate foreign keys. Each hand-named constraint below repeats the
--    schema-declared one on the same column. Drop a duplicate only when its
--    schema-declared twin exists, so no column is ever left without a foreign key.
DO $$
DECLARE
  fk record;
BEGIN
  FOR fk IN SELECT * FROM (VALUES
    ('credit_notes', 'credit_notes_customer_fkey', 'credit_notes_customer_id_fkey'),
    ('credit_notes', 'credit_notes_invoice_fkey', 'credit_notes_invoice_id_fkey'),
    ('credit_notes', 'credit_notes_return_fkey', 'credit_notes_return_id_fkey'),
    ('credit_notes', 'credit_notes_shop_fkey', 'credit_notes_shop_id_fkey'),
    ('customer_returns', 'customer_returns_customer_fkey', 'customer_returns_customer_id_fkey'),
    ('customer_returns', 'customer_returns_invoice_fkey', 'customer_returns_invoice_id_fkey'),
    ('customer_returns', 'customer_returns_shop_fkey', 'customer_returns_shop_id_fkey'),
    ('customer_returns', 'customer_returns_so_fkey', 'customer_returns_sales_order_id_fkey'),
    ('customer_return_items', 'customer_return_items_product_fkey', 'customer_return_items_product_id_fkey'),
    ('customer_return_items', 'customer_return_items_return_fkey', 'customer_return_items_return_id_fkey')
  ) AS t(table_name, duplicate_name, kept_name)
  LOOP
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fk.kept_name AND conrelid = to_regclass('public.' || fk.table_name))
       AND EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fk.duplicate_name AND conrelid = to_regclass('public.' || fk.table_name)) THEN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', fk.table_name, fk.duplicate_name);
    END IF;
  END LOOP;
END $$;

-- 2. Database-side id / updated_at defaults. Prisma generates these values
--    (@default(uuid()), @updatedAt), as it does for every other table.
ALTER TABLE IF EXISTS "ai_memory" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "assistant_actions" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "company_health_score_configs" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "credit_notes" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "customer_activities" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "customer_return_items" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "customer_returns" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "dispatch_batch_items" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "document_branding" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "document_registry" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "eway_bill_items" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "goods_issue_item_lots" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "inventory_exceptions" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "inventory_lot_alerts" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "inventory_lots" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "notification_policies" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "notification_timeline" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "recipient_engagements" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "stock_transfer_item_lots" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "stock_transfer_status_history" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "workflow_graphs" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "workflow_nodes" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "workflow_versions" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "company_health_score_configs" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE IF EXISTS "credit_notes" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE IF EXISTS "customer_contact_channels" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE IF EXISTS "customer_returns" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE IF EXISTS "document_registry" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE IF EXISTS "followup_threads" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE IF EXISTS "inventory_lots" ALTER COLUMN "updated_at" DROP DEFAULT;

-- 3. NOT NULL columns the schema declares non-nullable. Prisma cannot read a row
--    holding NULL in these columns, so backfill any such rows first (with the
--    column's default where it has one), then add the constraint.
DO $$
BEGIN
  -- Tenant RLS policies must not hide rows from this one-off backfill.
  PERFORM set_config('app.allow_unscoped_access', 'true', true);

  UPDATE "document_registry" SET "generated_at" = COALESCE("created_at", now()) WHERE "generated_at" IS NULL;
  UPDATE "document_registry" SET "created_at" = COALESCE("generated_at", now()) WHERE "created_at" IS NULL;
  UPDATE "document_registry" SET "updated_at" = COALESCE("created_at", now()) WHERE "updated_at" IS NULL;
  UPDATE "document_registry" SET "download_count" = 0 WHERE "download_count" IS NULL;

  UPDATE "pdf_jobs" SET "job_type" = 'unknown' WHERE "job_type" IS NULL;
  UPDATE "pdf_jobs" SET "status" = 'unknown' WHERE "status" IS NULL;
  UPDATE "pdf_jobs" SET "progress" = 0 WHERE "progress" IS NULL;
  UPDATE "pdf_jobs" SET "created_at" = now() WHERE "created_at" IS NULL;

  UPDATE "eway_bills" SET "sub_type" = 'SUPPLY' WHERE "sub_type" IS NULL;
  UPDATE "eway_bills" SET "transaction_type" = 'REGULAR' WHERE "transaction_type" IS NULL;
  UPDATE "eway_bills" SET "vehicle_type" = 'REGULAR' WHERE "vehicle_type" IS NULL;
END $$;

ALTER TABLE "document_registry"
  ALTER COLUMN "generated_at" SET NOT NULL,
  ALTER COLUMN "download_count" SET NOT NULL,
  ALTER COLUMN "created_at" SET NOT NULL,
  ALTER COLUMN "updated_at" SET NOT NULL;

ALTER TABLE "pdf_jobs"
  ALTER COLUMN "job_type" SET NOT NULL,
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "progress" SET NOT NULL,
  ALTER COLUMN "created_at" SET NOT NULL;

ALTER TABLE "eway_bills"
  ALTER COLUMN "sub_type" SET NOT NULL,
  ALTER COLUMN "transaction_type" SET NOT NULL,
  ALTER COLUMN "vehicle_type" SET NOT NULL;

-- 4. Foreign keys the schema declares but the database lacks. Added NOT VALID:
--    new rows are checked immediately; existing rows are validated by the next
--    migrations, which do not block writes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_logs_company_id_fkey' AND conrelid = 'public.audit_logs'::regclass
  ) THEN
    ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'eway_bills_invoice_id_fkey' AND conrelid = 'public.eway_bills'::regclass
  ) THEN
    ALTER TABLE "eway_bills" ADD CONSTRAINT "eway_bills_invoice_id_fkey"
      FOREIGN KEY ("invoice_id") REFERENCES "invoice_header"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;
END $$;

-- 5. Indexes: add the one the schema declares on eway_bills (a small table), and
--    drop one that duplicates the unique index on the same column.
CREATE INDEX IF NOT EXISTS "eway_bills_customer_id_idx" ON "eway_bills"("customer_id");
DROP INDEX IF EXISTS "company_health_score_configs_company_idx";
