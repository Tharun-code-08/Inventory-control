-- Schema reconstruction: creates the procurement/sales tables defined in
-- schema.prisma that the placeholder migrations (add_procurement_master,
-- add_supplier_quotations) never created. Columns owned by later migrations
-- (unguarded ADD COLUMN) are deliberately omitted here.
-- Every statement is idempotent: this is a no-op on staging/prod where the
-- objects already exist.

-- ===== Enum types =====

DO $$ BEGIN
  CREATE TYPE "SubscriptionPlan" AS ENUM ('TRIAL', 'PRO', 'PLUS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SalesOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'FULFILLED', 'CLOSED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SalesQuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'USER_REQUESTED', 'CANCELLED', 'CONVERTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AlertType" AS ENUM ('LOW_STOCK', 'CONTRACT_EXPIRY', 'RFQ_DEADLINE', 'PO_OVERDUE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== Tables =====

CREATE TABLE IF NOT EXISTS "companies" (
    "id" UUID NOT NULL,
    "company_code" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "subscription_plan" "SubscriptionPlan" NOT NULL DEFAULT 'TRIAL',
    "billing_cycle" "BillingCycle",
    "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "trial_starts_at" TIMESTAMPTZ(6),
    "trial_ends_at" TIMESTAMPTZ(6),
    "subscription_ends_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "suppliers" (
    "id" UUID NOT NULL,
    "supplier_code" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "company_id" UUID,
    "tax_id" TEXT,
    "vat_number" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
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
    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "rfq_header" (
    "id" UUID NOT NULL,
    "rfq_number" TEXT NOT NULL,
    "rfq_date" DATE NOT NULL,
    "deadline" DATE,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "shop_id" UUID NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "posted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "rfq_header_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "rfq_suppliers" (
    "id" UUID NOT NULL,
    "rfq_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rfq_suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "rfq_items" (
    "id" UUID NOT NULL,
    "rfq_header_id" UUID NOT NULL,
    "product_id" UUID,
    "description" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "uom" TEXT NOT NULL,
    "specifications" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "rfq_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "contract_header" (
    "id" UUID NOT NULL,
    "contract_number" TEXT NOT NULL,
    "shop_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "rfq_id" UUID,
    "quotation_id" UUID,
    "title" TEXT NOT NULL,
    "payment_terms" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "notes" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "posted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "contract_header_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "contract_items" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "product_id" UUID,
    "description" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "uom" TEXT NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "line_value" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "contract_items_pkey" PRIMARY KEY ("id")
);

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
    "total_value" DECIMAL(14,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "supplier_quote_header_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "supplier_quote_items" (
    "id" UUID NOT NULL,
    "quote_header_id" UUID NOT NULL,
    "rfq_item_id" UUID,
    "product_id" UUID,
    "description" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "uom" TEXT NOT NULL,
    "specifications" TEXT,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "line_value" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "supplier_quote_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "customers" (
    "id" UUID NOT NULL,
    "customer_code" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "tax_id" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "shop_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sales_quote_header" (
    "id" UUID NOT NULL,
    "quote_number" TEXT NOT NULL,
    "quote_date" DATE NOT NULL,
    "valid_until" DATE,
    "customer_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "status" "SalesQuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "sales_order_id" UUID,
    "portal_token" TEXT,
    "remarks" TEXT,
    "total_value" DECIMAL(14,2),
    "customer_requested_total" DECIMAL(14,2),
    "customer_request_note" TEXT,
    "customer_responded_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "sales_quote_header_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sales_quote_items" (
    "id" UUID NOT NULL,
    "quote_header_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "uom" TEXT NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "line_value" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "sales_quote_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sales_order_header" (
    "id" UUID NOT NULL,
    "so_number" TEXT NOT NULL,
    "order_date" DATE NOT NULL,
    "expected_date" DATE,
    "customer_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "status" "SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "total_value" DECIMAL(14,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "sales_order_header_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sales_order_items" (
    "id" UUID NOT NULL,
    "so_header_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "uom" TEXT NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "line_value" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "invoice_header" (
    "id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "invoice_date" DATE NOT NULL,
    "sales_order_id" UUID,
    "customer_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "total_value" DECIMAL(14,2) NOT NULL,
    "paid_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "due_date" DATE,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "invoice_header_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "payment_receipts" (
    "id" UUID NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "receipt_date" DATE NOT NULL,
    "invoice_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "payment_receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "alert_events" (
    "id" UUID NOT NULL,
    "alert_type" "AlertType" NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "shop_id" UUID,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "triggered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

-- ===== Indexes =====

CREATE UNIQUE INDEX IF NOT EXISTS "companies_company_code_key" ON "companies"("company_code");
CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_supplier_code_key" ON "suppliers"("supplier_code");
CREATE INDEX IF NOT EXISTS "suppliers_company_id_idx" ON "suppliers"("company_id");
CREATE INDEX IF NOT EXISTS "suppliers_supplier_name_idx" ON "suppliers"("supplier_name");
CREATE UNIQUE INDEX IF NOT EXISTS "rfq_header_rfq_number_key" ON "rfq_header"("rfq_number");
CREATE INDEX IF NOT EXISTS "rfq_header_shop_id_rfq_date_idx" ON "rfq_header"("shop_id", "rfq_date");
CREATE INDEX IF NOT EXISTS "rfq_suppliers_supplier_id_idx" ON "rfq_suppliers"("supplier_id");
CREATE UNIQUE INDEX IF NOT EXISTS "rfq_suppliers_rfq_id_supplier_id_key" ON "rfq_suppliers"("rfq_id", "supplier_id");
CREATE INDEX IF NOT EXISTS "rfq_items_rfq_header_id_idx" ON "rfq_items"("rfq_header_id");
CREATE UNIQUE INDEX IF NOT EXISTS "contract_header_contract_number_key" ON "contract_header"("contract_number");
CREATE INDEX IF NOT EXISTS "contract_header_shop_id_start_date_idx" ON "contract_header"("shop_id", "start_date");
CREATE INDEX IF NOT EXISTS "contract_header_supplier_id_idx" ON "contract_header"("supplier_id");
CREATE INDEX IF NOT EXISTS "contract_items_contract_id_idx" ON "contract_items"("contract_id");
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_quote_header_quote_number_key" ON "supplier_quote_header"("quote_number");
CREATE INDEX IF NOT EXISTS "supplier_quote_header_shop_id_quote_date_idx" ON "supplier_quote_header"("shop_id", "quote_date");
CREATE INDEX IF NOT EXISTS "supplier_quote_header_rfq_id_supplier_id_idx" ON "supplier_quote_header"("rfq_id", "supplier_id");
CREATE INDEX IF NOT EXISTS "supplier_quote_items_quote_header_id_idx" ON "supplier_quote_items"("quote_header_id");
CREATE INDEX IF NOT EXISTS "supplier_quote_items_rfq_item_id_idx" ON "supplier_quote_items"("rfq_item_id");
CREATE UNIQUE INDEX IF NOT EXISTS "customers_customer_code_key" ON "customers"("customer_code");
CREATE INDEX IF NOT EXISTS "customers_shop_id_customer_name_idx" ON "customers"("shop_id", "customer_name");
CREATE UNIQUE INDEX IF NOT EXISTS "sales_quote_header_quote_number_key" ON "sales_quote_header"("quote_number");
CREATE UNIQUE INDEX IF NOT EXISTS "sales_quote_header_sales_order_id_key" ON "sales_quote_header"("sales_order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "sales_quote_header_portal_token_key" ON "sales_quote_header"("portal_token");
CREATE INDEX IF NOT EXISTS "sales_quote_header_shop_id_quote_date_idx" ON "sales_quote_header"("shop_id", "quote_date");
CREATE INDEX IF NOT EXISTS "sales_quote_header_customer_id_idx" ON "sales_quote_header"("customer_id");
CREATE INDEX IF NOT EXISTS "sales_quote_header_status_idx" ON "sales_quote_header"("status");
CREATE INDEX IF NOT EXISTS "sales_quote_items_quote_header_id_idx" ON "sales_quote_items"("quote_header_id");
CREATE UNIQUE INDEX IF NOT EXISTS "sales_order_header_so_number_key" ON "sales_order_header"("so_number");
CREATE INDEX IF NOT EXISTS "sales_order_header_shop_id_order_date_idx" ON "sales_order_header"("shop_id", "order_date");
CREATE INDEX IF NOT EXISTS "sales_order_header_customer_id_idx" ON "sales_order_header"("customer_id");
CREATE INDEX IF NOT EXISTS "sales_order_items_so_header_id_idx" ON "sales_order_items"("so_header_id");
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_header_invoice_number_key" ON "invoice_header"("invoice_number");
CREATE INDEX IF NOT EXISTS "invoice_header_shop_id_invoice_date_idx" ON "invoice_header"("shop_id", "invoice_date");
CREATE INDEX IF NOT EXISTS "invoice_header_shop_id_status_invoice_date_idx" ON "invoice_header"("shop_id", "status", "invoice_date");
CREATE INDEX IF NOT EXISTS "invoice_header_customer_id_idx" ON "invoice_header"("customer_id");
CREATE INDEX IF NOT EXISTS "invoice_header_sales_order_id_idx" ON "invoice_header"("sales_order_id");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_receipts_receipt_number_key" ON "payment_receipts"("receipt_number");
CREATE INDEX IF NOT EXISTS "payment_receipts_shop_id_receipt_date_idx" ON "payment_receipts"("shop_id", "receipt_date");
CREATE INDEX IF NOT EXISTS "payment_receipts_invoice_id_idx" ON "payment_receipts"("invoice_id");
CREATE INDEX IF NOT EXISTS "alert_events_alert_type_triggered_at_idx" ON "alert_events"("alert_type", "triggered_at");
CREATE INDEX IF NOT EXISTS "alert_events_shop_id_is_read_idx" ON "alert_events"("shop_id", "is_read");

-- ===== Foreign keys (added only when the referenced table already exists) =====

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='companies')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suppliers_company_id_fkey') THEN
    ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shops')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rfq_header_shop_id_fkey') THEN
    ALTER TABLE "rfq_header" ADD CONSTRAINT "rfq_header_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rfq_header')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rfq_suppliers_rfq_id_fkey') THEN
    ALTER TABLE "rfq_suppliers" ADD CONSTRAINT "rfq_suppliers_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfq_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='suppliers')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rfq_suppliers_supplier_id_fkey') THEN
    ALTER TABLE "rfq_suppliers" ADD CONSTRAINT "rfq_suppliers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rfq_header')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rfq_items_rfq_header_id_fkey') THEN
    ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_rfq_header_id_fkey" FOREIGN KEY ("rfq_header_id") REFERENCES "rfq_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rfq_items_product_id_fkey') THEN
    ALTER TABLE "rfq_items" ADD CONSTRAINT "rfq_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shops')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_header_shop_id_fkey') THEN
    ALTER TABLE "contract_header" ADD CONSTRAINT "contract_header_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='suppliers')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_header_supplier_id_fkey') THEN
    ALTER TABLE "contract_header" ADD CONSTRAINT "contract_header_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rfq_header')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_header_rfq_id_fkey') THEN
    ALTER TABLE "contract_header" ADD CONSTRAINT "contract_header_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfq_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='supplier_quote_header')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_header_quotation_id_fkey') THEN
    ALTER TABLE "contract_header" ADD CONSTRAINT "contract_header_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "supplier_quote_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contract_header')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_items_contract_id_fkey') THEN
    ALTER TABLE "contract_items" ADD CONSTRAINT "contract_items_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contract_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_items_product_id_fkey') THEN
    ALTER TABLE "contract_items" ADD CONSTRAINT "contract_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shops')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_quote_header_shop_id_fkey') THEN
    ALTER TABLE "supplier_quote_header" ADD CONSTRAINT "supplier_quote_header_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rfq_header')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_quote_header_rfq_id_fkey') THEN
    ALTER TABLE "supplier_quote_header" ADD CONSTRAINT "supplier_quote_header_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "rfq_header"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='suppliers')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_quote_header_supplier_id_fkey') THEN
    ALTER TABLE "supplier_quote_header" ADD CONSTRAINT "supplier_quote_header_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='supplier_quote_header')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_quote_items_quote_header_id_fkey') THEN
    ALTER TABLE "supplier_quote_items" ADD CONSTRAINT "supplier_quote_items_quote_header_id_fkey" FOREIGN KEY ("quote_header_id") REFERENCES "supplier_quote_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='rfq_items')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_quote_items_rfq_item_id_fkey') THEN
    ALTER TABLE "supplier_quote_items" ADD CONSTRAINT "supplier_quote_items_rfq_item_id_fkey" FOREIGN KEY ("rfq_item_id") REFERENCES "rfq_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'supplier_quote_items_product_id_fkey') THEN
    ALTER TABLE "supplier_quote_items" ADD CONSTRAINT "supplier_quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shops')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customers_shop_id_fkey') THEN
    ALTER TABLE "customers" ADD CONSTRAINT "customers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='customers')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_quote_header_customer_id_fkey') THEN
    ALTER TABLE "sales_quote_header" ADD CONSTRAINT "sales_quote_header_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shops')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_quote_header_shop_id_fkey') THEN
    ALTER TABLE "sales_quote_header" ADD CONSTRAINT "sales_quote_header_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sales_order_header')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_quote_header_sales_order_id_fkey') THEN
    ALTER TABLE "sales_quote_header" ADD CONSTRAINT "sales_quote_header_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_order_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sales_quote_header')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_quote_items_quote_header_id_fkey') THEN
    ALTER TABLE "sales_quote_items" ADD CONSTRAINT "sales_quote_items_quote_header_id_fkey" FOREIGN KEY ("quote_header_id") REFERENCES "sales_quote_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_quote_items_product_id_fkey') THEN
    ALTER TABLE "sales_quote_items" ADD CONSTRAINT "sales_quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='customers')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_order_header_customer_id_fkey') THEN
    ALTER TABLE "sales_order_header" ADD CONSTRAINT "sales_order_header_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shops')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_order_header_shop_id_fkey') THEN
    ALTER TABLE "sales_order_header" ADD CONSTRAINT "sales_order_header_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sales_order_header')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_order_items_so_header_id_fkey') THEN
    ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_so_header_id_fkey" FOREIGN KEY ("so_header_id") REFERENCES "sales_order_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_order_items_product_id_fkey') THEN
    ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='customers')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_header_customer_id_fkey') THEN
    ALTER TABLE "invoice_header" ADD CONSTRAINT "invoice_header_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shops')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_header_shop_id_fkey') THEN
    ALTER TABLE "invoice_header" ADD CONSTRAINT "invoice_header_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sales_order_header')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_header_sales_order_id_fkey') THEN
    ALTER TABLE "invoice_header" ADD CONSTRAINT "invoice_header_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_order_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='invoice_header')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_receipts_invoice_id_fkey') THEN
    ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shops')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_receipts_shop_id_fkey') THEN
    ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shops')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alert_events_shop_id_fkey') THEN
    ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ===== Columns missing from earlier-created tables (schema drift repair) =====

ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "company_id" UUID;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shops_company_id_fkey') THEN
    ALTER TABLE "shops" ADD CONSTRAINT "shops_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "tax_id" TEXT;
