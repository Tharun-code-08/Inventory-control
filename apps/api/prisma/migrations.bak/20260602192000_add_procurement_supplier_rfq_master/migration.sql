-- Procurement master tables were never created in init/stub migrations.
-- Idempotent so deploy succeeds on DBs that already have these tables.

DO $$ BEGIN
  CREATE TYPE "GstTreatment" AS ENUM (
    'REGISTERED_BUSINESS',
    'UNREGISTERED_BUSINESS',
    'COMPOSITION',
    'CONSUMER',
    'OVERSEAS',
    'SEZ',
    'DEEMED_EXPORT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SupplierAddressType" AS ENUM ('BILLING', 'SHIPPING');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BrandingMode" AS ENUM ('LIVE', 'SNAPSHOT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "suppliers" (
  "id" UUID NOT NULL,
  "supplier_code" TEXT NOT NULL,
  "supplier_name" TEXT NOT NULL,
  "company_id" UUID,
  "tax_id" TEXT,
  "vat_number" TEXT,
  "rating" INTEGER NOT NULL DEFAULT 0,
  "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "contact_person" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "street" TEXT,
  "city" TEXT,
  "state" TEXT,
  "postal_code" TEXT,
  "country" TEXT,
  "payment_terms" TEXT,
  "bank_name" TEXT,
  "account_number" TEXT,
  "routing_number" TEXT,
  "iban" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "created_by" UUID,
  "updated_by" UUID,
  "deleted_at" TIMESTAMPTZ(6),
  "display_name" TEXT,
  "company_name" TEXT,
  "salutation" TEXT,
  "first_name" TEXT,
  "last_name" TEXT,
  "gstin" TEXT,
  "gst_treatment" "GstTreatment",
  "source_of_supply" TEXT,
  "pan" TEXT,
  "msme_registered" BOOLEAN NOT NULL DEFAULT false,
  "currency" TEXT DEFAULT 'INR',
  "tds_section" TEXT,
  "remarks" TEXT,
  "work_phone" TEXT,
  "mobile_phone" TEXT,
  "language" TEXT DEFAULT 'English',
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- Table may already exist without vendor-profile columns (CREATE TABLE IF NOT EXISTS skips).
DO $$
BEGIN
  IF to_regclass('public.suppliers') IS NOT NULL THEN
    ALTER TABLE "suppliers"
      ADD COLUMN IF NOT EXISTS "company_id" UUID,
      ADD COLUMN IF NOT EXISTS "tax_id" TEXT,
      ADD COLUMN IF NOT EXISTS "vat_number" TEXT,
      ADD COLUMN IF NOT EXISTS "rating" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      ADD COLUMN IF NOT EXISTS "contact_person" TEXT,
      ADD COLUMN IF NOT EXISTS "email" TEXT,
      ADD COLUMN IF NOT EXISTS "phone" TEXT,
      ADD COLUMN IF NOT EXISTS "street" TEXT,
      ADD COLUMN IF NOT EXISTS "city" TEXT,
      ADD COLUMN IF NOT EXISTS "state" TEXT,
      ADD COLUMN IF NOT EXISTS "postal_code" TEXT,
      ADD COLUMN IF NOT EXISTS "country" TEXT,
      ADD COLUMN IF NOT EXISTS "payment_terms" TEXT,
      ADD COLUMN IF NOT EXISTS "bank_name" TEXT,
      ADD COLUMN IF NOT EXISTS "account_number" TEXT,
      ADD COLUMN IF NOT EXISTS "routing_number" TEXT,
      ADD COLUMN IF NOT EXISTS "iban" TEXT,
      ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ(6),
      ADD COLUMN IF NOT EXISTS "display_name" TEXT,
      ADD COLUMN IF NOT EXISTS "company_name" TEXT,
      ADD COLUMN IF NOT EXISTS "salutation" TEXT,
      ADD COLUMN IF NOT EXISTS "first_name" TEXT,
      ADD COLUMN IF NOT EXISTS "last_name" TEXT,
      ADD COLUMN IF NOT EXISTS "gstin" TEXT,
      ADD COLUMN IF NOT EXISTS "gst_treatment" "GstTreatment",
      ADD COLUMN IF NOT EXISTS "source_of_supply" TEXT,
      ADD COLUMN IF NOT EXISTS "pan" TEXT,
      ADD COLUMN IF NOT EXISTS "msme_registered" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'INR',
      ADD COLUMN IF NOT EXISTS "tds_section" TEXT,
      ADD COLUMN IF NOT EXISTS "remarks" TEXT,
      ADD COLUMN IF NOT EXISTS "work_phone" TEXT,
      ADD COLUMN IF NOT EXISTS "mobile_phone" TEXT,
      ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'English';

    CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_supplier_code_key" ON "suppliers"("supplier_code");
    CREATE INDEX IF NOT EXISTS "suppliers_company_id_idx" ON "suppliers"("company_id");
    CREATE INDEX IF NOT EXISTS "suppliers_supplier_name_idx" ON "suppliers"("supplier_name");
    CREATE INDEX IF NOT EXISTS "suppliers_deleted_at_idx" ON "suppliers"("deleted_at");

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'display_name'
    ) THEN
      CREATE INDEX IF NOT EXISTS "suppliers_display_name_idx" ON "suppliers"("display_name");
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'gstin'
    ) THEN
      CREATE INDEX IF NOT EXISTS "suppliers_gstin_idx" ON "suppliers"("gstin");
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_company_id_fkey'
     ) THEN
    ALTER TABLE "suppliers"
      ADD CONSTRAINT "suppliers_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.suppliers') IS NOT NULL
     AND to_regclass('public.companies') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'suppliers'
         AND column_name = 'company_id'
     )
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'suppliers' AND policyname = 'rls_suppliers_company'
     ) THEN
    ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
    CREATE POLICY rls_suppliers_company ON suppliers
      USING (company_id IS NULL OR company_id = current_setting('app.current_company_id', true)::uuid);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "rfq_header" (
  "id" UUID NOT NULL,
  "rfq_number" TEXT NOT NULL,
  "rfq_date" DATE NOT NULL,
  "deadline" DATE,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "shop_id" UUID NOT NULL,
  "branding_mode" "BrandingMode" NOT NULL DEFAULT 'LIVE',
  "branding_snapshot" JSONB,
  "branding_version" INTEGER,
  "template_version" INTEGER NOT NULL DEFAULT 1,
  "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "posted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "created_by" UUID,
  "updated_by" UUID,
  CONSTRAINT "rfq_header_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "rfq_header_rfq_number_key" ON "rfq_header"("rfq_number");
CREATE INDEX IF NOT EXISTS "rfq_header_shop_id_rfq_date_idx" ON "rfq_header"("shop_id", "rfq_date");

DO $$
BEGIN
  IF to_regclass('public.shops') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'rfq_header_shop_id_fkey'
     ) THEN
    ALTER TABLE "rfq_header"
      ADD CONSTRAINT "rfq_header_shop_id_fkey"
      FOREIGN KEY ("shop_id") REFERENCES "shops"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "rfq_suppliers" (
  "id" UUID NOT NULL,
  "rfq_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rfq_suppliers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "rfq_suppliers_rfq_id_supplier_id_key"
  ON "rfq_suppliers"("rfq_id", "supplier_id");
CREATE INDEX IF NOT EXISTS "rfq_suppliers_supplier_id_idx" ON "rfq_suppliers"("supplier_id");

DO $$
BEGIN
  IF to_regclass('public.rfq_header') IS NOT NULL
     AND to_regclass('public.suppliers') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'rfq_suppliers_rfq_id_fkey'
     ) THEN
    ALTER TABLE "rfq_suppliers"
      ADD CONSTRAINT "rfq_suppliers_rfq_id_fkey"
      FOREIGN KEY ("rfq_id") REFERENCES "rfq_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF to_regclass('public.suppliers') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'rfq_suppliers_supplier_id_fkey'
     ) THEN
    ALTER TABLE "rfq_suppliers"
      ADD CONSTRAINT "rfq_suppliers_supplier_id_fkey"
      FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "rfq_items" (
  "id" UUID NOT NULL,
  "rfq_header_id" UUID NOT NULL,
  "product_id" UUID,
  "description" TEXT,
  "quantity" DECIMAL(12, 3) NOT NULL,
  "uom" TEXT NOT NULL,
  "specifications" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "created_by" UUID,
  "updated_by" UUID,
  CONSTRAINT "rfq_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "rfq_items_rfq_header_id_idx" ON "rfq_items"("rfq_header_id");

DO $$
BEGIN
  IF to_regclass('public.rfq_header') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'rfq_items_rfq_header_id_fkey'
     ) THEN
    ALTER TABLE "rfq_items"
      ADD CONSTRAINT "rfq_items_rfq_header_id_fkey"
      FOREIGN KEY ("rfq_header_id") REFERENCES "rfq_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF to_regclass('public.products') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'rfq_items_product_id_fkey'
     ) THEN
    ALTER TABLE "rfq_items"
      ADD CONSTRAINT "rfq_items_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "supplier_quote_header" (
  "id" UUID NOT NULL,
  "quote_number" TEXT NOT NULL,
  "quote_date" DATE NOT NULL,
  "shop_id" UUID NOT NULL,
  "rfq_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "notes" TEXT,
  "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "posted_at" TIMESTAMPTZ(6),
  "total_value" DECIMAL(14, 2),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "created_by" UUID,
  "updated_by" UUID,
  CONSTRAINT "supplier_quote_header_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "supplier_quote_header_quote_number_key"
  ON "supplier_quote_header"("quote_number");
CREATE INDEX IF NOT EXISTS "supplier_quote_header_shop_id_quote_date_idx"
  ON "supplier_quote_header"("shop_id", "quote_date");
CREATE INDEX IF NOT EXISTS "supplier_quote_header_rfq_id_supplier_id_idx"
  ON "supplier_quote_header"("rfq_id", "supplier_id");

DO $$
BEGIN
  IF to_regclass('public.shops') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'supplier_quote_header_shop_id_fkey'
     ) THEN
    ALTER TABLE "supplier_quote_header"
      ADD CONSTRAINT "supplier_quote_header_shop_id_fkey"
      FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF to_regclass('public.rfq_header') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'supplier_quote_header_rfq_id_fkey'
     ) THEN
    ALTER TABLE "supplier_quote_header"
      ADD CONSTRAINT "supplier_quote_header_rfq_id_fkey"
      FOREIGN KEY ("rfq_id") REFERENCES "rfq_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF to_regclass('public.suppliers') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'supplier_quote_header_supplier_id_fkey'
     ) THEN
    ALTER TABLE "supplier_quote_header"
      ADD CONSTRAINT "supplier_quote_header_supplier_id_fkey"
      FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "supplier_quote_items" (
  "id" UUID NOT NULL,
  "quote_header_id" UUID NOT NULL,
  "rfq_item_id" UUID,
  "product_id" UUID,
  "description" TEXT,
  "quantity" DECIMAL(12, 3) NOT NULL,
  "uom" TEXT NOT NULL,
  "specifications" TEXT,
  "unit_price" DECIMAL(12, 2) NOT NULL,
  "line_value" DECIMAL(14, 2) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "created_by" UUID,
  "updated_by" UUID,
  CONSTRAINT "supplier_quote_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "supplier_quote_items_quote_header_id_idx"
  ON "supplier_quote_items"("quote_header_id");
CREATE INDEX IF NOT EXISTS "supplier_quote_items_rfq_item_id_idx"
  ON "supplier_quote_items"("rfq_item_id");

DO $$
BEGIN
  IF to_regclass('public.supplier_quote_header') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'supplier_quote_items_quote_header_id_fkey'
     ) THEN
    ALTER TABLE "supplier_quote_items"
      ADD CONSTRAINT "supplier_quote_items_quote_header_id_fkey"
      FOREIGN KEY ("quote_header_id") REFERENCES "supplier_quote_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF to_regclass('public.rfq_items') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'supplier_quote_items_rfq_item_id_fkey'
     ) THEN
    ALTER TABLE "supplier_quote_items"
      ADD CONSTRAINT "supplier_quote_items_rfq_item_id_fkey"
      FOREIGN KEY ("rfq_item_id") REFERENCES "rfq_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF to_regclass('public.products') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'supplier_quote_items_product_id_fkey'
     ) THEN
    ALTER TABLE "supplier_quote_items"
      ADD CONSTRAINT "supplier_quote_items_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Re-apply PO/RFQ FKs that were skipped when rfq tables were missing.
DO $$
BEGIN
  IF to_regclass('public.rfq_header') IS NOT NULL
     AND to_regclass('public.purchase_order_header') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'purchase_order_header_rfq_id_fkey'
     ) THEN
    ALTER TABLE "purchase_order_header"
      ADD CONSTRAINT "purchase_order_header_rfq_id_fkey"
      FOREIGN KEY ("rfq_id") REFERENCES "rfq_header"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF to_regclass('public.rfq_items') IS NOT NULL
     AND to_regclass('public.purchase_order_items') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'purchase_order_items_rfq_item_id_fkey'
     ) THEN
    ALTER TABLE "purchase_order_items"
      ADD CONSTRAINT "purchase_order_items_rfq_item_id_fkey"
      FOREIGN KEY ("rfq_item_id") REFERENCES "rfq_items"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
