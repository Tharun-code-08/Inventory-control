-- CreateEnum (guarded)
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

-- DropForeignKey
ALTER TABLE "cost_layers" DROP CONSTRAINT "cost_layers_product_fkey";

-- DropForeignKey
ALTER TABLE "cost_layers" DROP CONSTRAINT "cost_layers_shop_fkey";

-- DropForeignKey
ALTER TABLE "product_plants" DROP CONSTRAINT "product_plants_storage_location_id_fkey";

-- DropForeignKey
ALTER TABLE "supplier_return_items" DROP CONSTRAINT "supplier_return_items_product_fkey";

-- DropForeignKey
ALTER TABLE "supplier_return_items" DROP CONSTRAINT "supplier_return_items_return_fkey";

-- DropForeignKey
ALTER TABLE "supplier_returns" DROP CONSTRAINT "supplier_returns_po_fkey";

-- DropForeignKey
ALTER TABLE "supplier_returns" DROP CONSTRAINT "supplier_returns_shop_fkey";

-- AlterTable
ALTER TABLE "companies" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cost_layers" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "fx_rates" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "idempotency_keys" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "job_failures" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "product_barcodes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "product_plants" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "product_specifications" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "thumbnail_url" TEXT;

-- AlterTable
ALTER TABLE "sales_order_header" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sales_order_items" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "subscription_payments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "supplier_return_items" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "supplier_returns" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable (IF NOT EXISTS: may already exist from schema_reconstruction)
CREATE TABLE IF NOT EXISTS "sales_quote_header" (
    "id" UUID NOT NULL,
    "quote_number" TEXT NOT NULL,
    "quote_date" DATE NOT NULL,
    "valid_until" DATE,
    "customer_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "status" "SalesQuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "branding_mode" "BrandingMode" NOT NULL DEFAULT 'LIVE',
    "branding_snapshot" JSONB,
    "branding_version" INTEGER,
    "template_version" INTEGER NOT NULL DEFAULT 1,
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

-- Add missing branding columns to sales_quote_header if created by reconstruction (IF NOT EXISTS guard)
ALTER TABLE "sales_quote_header" ADD COLUMN IF NOT EXISTS "branding_mode" "BrandingMode" NOT NULL DEFAULT 'LIVE';
ALTER TABLE "sales_quote_header" ADD COLUMN IF NOT EXISTS "branding_snapshot" JSONB;
ALTER TABLE "sales_quote_header" ADD COLUMN IF NOT EXISTS "branding_version" INTEGER;
ALTER TABLE "sales_quote_header" ADD COLUMN IF NOT EXISTS "template_version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable (IF NOT EXISTS)
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

-- CreateTable (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "invoice_header" (
    "id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "invoice_date" DATE NOT NULL,
    "sales_order_id" UUID,
    "customer_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "branding_mode" "BrandingMode" NOT NULL DEFAULT 'SNAPSHOT',
    "branding_snapshot" JSONB,
    "branding_version" INTEGER,
    "template_version" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "fx_rate_used" DECIMAL(18,8),
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
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

-- Add missing columns to invoice_header if created by reconstruction
ALTER TABLE "invoice_header" ADD COLUMN IF NOT EXISTS "branding_mode" "BrandingMode" NOT NULL DEFAULT 'SNAPSHOT';
ALTER TABLE "invoice_header" ADD COLUMN IF NOT EXISTS "branding_snapshot" JSONB;
ALTER TABLE "invoice_header" ADD COLUMN IF NOT EXISTS "branding_version" INTEGER;
ALTER TABLE "invoice_header" ADD COLUMN IF NOT EXISTS "template_version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "invoice_header" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "invoice_header" ADD COLUMN IF NOT EXISTS "fx_rate_used" DECIMAL(18,8);
ALTER TABLE "invoice_header" ADD COLUMN IF NOT EXISTS "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "invoice_header" ADD COLUMN IF NOT EXISTS "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "payment_receipts" (
    "id" UUID NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "receipt_date" DATE NOT NULL,
    "invoice_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "fx_rate_used" DECIMAL(18,8),
    "method" TEXT,
    "reference" TEXT,
    "remarks" TEXT,
    "branding_mode" "BrandingMode" NOT NULL DEFAULT 'SNAPSHOT',
    "branding_snapshot" JSONB,
    "branding_version" INTEGER,
    "template_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "payment_receipts_pkey" PRIMARY KEY ("id")
);

-- Add missing columns to payment_receipts if created by reconstruction
ALTER TABLE "payment_receipts" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "payment_receipts" ADD COLUMN IF NOT EXISTS "fx_rate_used" DECIMAL(18,8);
ALTER TABLE "payment_receipts" ADD COLUMN IF NOT EXISTS "branding_mode" "BrandingMode" NOT NULL DEFAULT 'SNAPSHOT';
ALTER TABLE "payment_receipts" ADD COLUMN IF NOT EXISTS "branding_snapshot" JSONB;
ALTER TABLE "payment_receipts" ADD COLUMN IF NOT EXISTS "branding_version" INTEGER;
ALTER TABLE "payment_receipts" ADD COLUMN IF NOT EXISTS "template_version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable (IF NOT EXISTS)
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "customer_returns" (
    "id" UUID NOT NULL,
    "return_number" TEXT NOT NULL,
    "return_date" DATE NOT NULL,
    "shop_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "invoice_id" UUID,
    "sales_order_id" UUID,
    "reason" TEXT,
    "remarks" TEXT,
    "status" "ReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "total_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "posted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "customer_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "customer_return_items" (
    "id" UUID NOT NULL,
    "return_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "uom" TEXT NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "line_value" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "customer_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "credit_notes" (
    "id" UUID NOT NULL,
    "credit_number" TEXT NOT NULL,
    "credit_date" DATE NOT NULL,
    "shop_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "invoice_id" UUID,
    "return_id" UUID,
    "status" "CreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "amount" DECIMAL(14,2) NOT NULL,
    "applied_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sales_quote_header_quote_number_key" ON "sales_quote_header"("quote_number");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sales_quote_header_sales_order_id_key" ON "sales_quote_header"("sales_order_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sales_quote_header_portal_token_key" ON "sales_quote_header"("portal_token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_quote_header_shop_id_quote_date_idx" ON "sales_quote_header"("shop_id", "quote_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_quote_header_customer_id_idx" ON "sales_quote_header"("customer_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_quote_header_status_idx" ON "sales_quote_header"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_quote_items_quote_header_id_idx" ON "sales_quote_items"("quote_header_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_header_invoice_number_key" ON "invoice_header"("invoice_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invoice_header_shop_id_invoice_date_idx" ON "invoice_header"("shop_id", "invoice_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invoice_header_shop_id_status_invoice_date_idx" ON "invoice_header"("shop_id", "status", "invoice_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invoice_header_customer_id_idx" ON "invoice_header"("customer_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invoice_header_sales_order_id_idx" ON "invoice_header"("sales_order_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "payment_receipts_receipt_number_key" ON "payment_receipts"("receipt_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payment_receipts_shop_id_receipt_date_idx" ON "payment_receipts"("shop_id", "receipt_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payment_receipts_invoice_id_idx" ON "payment_receipts"("invoice_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "alert_events_alert_type_triggered_at_idx" ON "alert_events"("alert_type", "triggered_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "alert_events_shop_id_is_read_idx" ON "alert_events"("shop_id", "is_read");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "customer_returns_return_number_key" ON "customer_returns"("return_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customer_returns_shop_id_return_date_idx" ON "customer_returns"("shop_id", "return_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customer_returns_customer_id_idx" ON "customer_returns"("customer_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customer_returns_invoice_id_idx" ON "customer_returns"("invoice_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customer_return_items_return_id_idx" ON "customer_return_items"("return_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "credit_notes_credit_number_key" ON "credit_notes"("credit_number");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "credit_notes_return_id_key" ON "credit_notes"("return_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "credit_notes_shop_id_credit_date_idx" ON "credit_notes"("shop_id", "credit_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "credit_notes_customer_id_idx" ON "credit_notes"("customer_id");

-- AddForeignKey
ALTER TABLE "product_plants" ADD CONSTRAINT "product_plants_storage_location_id_fkey" FOREIGN KEY ("storage_location_id") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_layers" ADD CONSTRAINT "cost_layers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_layers" ADD CONSTRAINT "cost_layers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "sales_quote_header" ADD CONSTRAINT "sales_quote_header_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "sales_quote_header" ADD CONSTRAINT "sales_quote_header_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "sales_quote_header" ADD CONSTRAINT "sales_quote_header_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_order_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "sales_quote_items" ADD CONSTRAINT "sales_quote_items_quote_header_id_fkey" FOREIGN KEY ("quote_header_id") REFERENCES "sales_quote_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "sales_quote_items" ADD CONSTRAINT "sales_quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "invoice_header" ADD CONSTRAINT "invoice_header_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "invoice_header" ADD CONSTRAINT "invoice_header_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "invoice_header" ADD CONSTRAINT "invoice_header_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_order_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "customer_returns" ADD CONSTRAINT "customer_returns_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "customer_returns" ADD CONSTRAINT "customer_returns_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "customer_returns" ADD CONSTRAINT "customer_returns_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "customer_returns" ADD CONSTRAINT "customer_returns_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_order_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "customer_return_items" ADD CONSTRAINT "customer_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "customer_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "customer_return_items" ADD CONSTRAINT "customer_return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_returns" ADD CONSTRAINT "supplier_returns_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_order_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_return_items" ADD CONSTRAINT "supplier_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "supplier_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_return_items" ADD CONSTRAINT "supplier_return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "customer_returns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
ALTER TABLE "supplier_bill_header" ADD CONSTRAINT "supplier_bill_header_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "cost_layers_shop_product_created_idx" RENAME TO "cost_layers_shop_id_product_id_created_at_idx";

-- RenameIndex
ALTER INDEX "supplier_return_items_return_idx" RENAME TO "supplier_return_items_return_id_idx";

-- RenameIndex
ALTER INDEX "supplier_returns_po_idx" RENAME TO "supplier_returns_purchase_order_id_idx";

-- RenameIndex
ALTER INDEX "supplier_returns_shop_date_idx" RENAME TO "supplier_returns_shop_id_return_date_idx";
