-- Schema↔migrations reconciliation: enum-typed columns that the migrations
-- created as TEXT (Category B "column type mismatches" in
-- docs/workflow-engine/SCHEMA-RECONCILIATION-ANALYSIS.md).
--
-- schema.prisma declares these columns as enums, so Prisma sends enum-typed
-- parameters. On a database built from the migrations the enum types are
-- missing ("type public.ExceptionType does not exist") or the column is text
-- ("operator does not exist: text = EwayDocumentType"), which breaks every
-- query on inventory_exceptions and document_branding and enum filters on
-- eway_bills.document_type.
--
-- Safe on every environment:
--   * enum types are created only if missing;
--   * a column is converted only while it is still TEXT and every stored value
--     is a valid label of the target enum; otherwise it is left untouched and a
--     NOTICE names it for manual reconciliation (the migration does not fail);
--   * databases that already have the enum columns (schemas accreted by
--     `db push`) are not changed at all.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'DocumentType') THEN
    CREATE TYPE "DocumentType" AS ENUM (
      'INVOICE', 'PURCHASE_ORDER', 'QUOTATION', 'GOODS_ISSUE', 'GOODS_RECEIPT', 'EWAY_BILL',
      'DELIVERY_CHALLAN', 'CREDIT_NOTE', 'DEBIT_NOTE', 'PRODUCTION_ORDER', 'SERVICE_ORDER', 'RFQ',
      'DELIVERY_NOTE', 'STOCK_TRANSFER', 'PURCHASE_RETURN', 'SALES_RETURN', 'MATERIAL_REQUEST',
      'WORK_ORDER', 'REPORT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'ExceptionType') THEN
    CREATE TYPE "ExceptionType" AS ENUM ('EXPIRY', 'LOW_STOCK', 'TRANSFER', 'BLOCKED_LOT', 'INVENTORY_INTEGRITY');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'ExceptionSeverity') THEN
    CREATE TYPE "ExceptionSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'ExceptionStatus') THEN
    CREATE TYPE "ExceptionStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'EntityType') THEN
    CREATE TYPE "EntityType" AS ENUM ('LOT', 'PRODUCT', 'TRANSFER', 'STORAGE_LOCATION');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typname = 'ResolutionType') THEN
    CREATE TYPE "ResolutionType" AS ENUM ('AUTOMATIC', 'MANUAL');
  END IF;
END $$;

DO $$
DECLARE
  c record;
  invalid bigint;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('inventory_exceptions', 'type',            'ExceptionType',     NULL),
      ('inventory_exceptions', 'severity',        'ExceptionSeverity', NULL),
      ('inventory_exceptions', 'entity_type',     'EntityType',        NULL),
      ('inventory_exceptions', 'status',          'ExceptionStatus',   'OPEN'),
      ('inventory_exceptions', 'resolution_type', 'ResolutionType',    NULL),
      ('document_branding',    'document_type',   'DocumentType',      NULL),
      ('eway_bills',           'document_type',   'EwayDocumentType',  'TAX_INVOICE')
    ) AS v(tbl, col, enum_type, default_label)
  LOOP
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = c.tbl AND column_name = c.col
        AND data_type = 'text');

    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE %I IS NOT NULL AND %I NOT IN (
         SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
         JOIN pg_namespace n ON n.oid = t.typnamespace
         WHERE n.nspname = ''public'' AND t.typname = %L)',
      c.tbl, c.col, c.col, c.enum_type)
    INTO invalid;

    IF invalid > 0 THEN
      RAISE NOTICE 'Skipped %.%: % row(s) hold values that are not % labels; reconcile manually.',
        c.tbl, c.col, invalid, c.enum_type;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', c.tbl, c.col);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE public.%I USING %I::public.%I',
      c.tbl, c.col, c.enum_type, c.col, c.enum_type);
    IF c.default_label IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT %L::public.%I',
        c.tbl, c.col, c.default_label, c.enum_type);
    END IF;
  END LOOP;
END $$;
