-- CreateEnum
CREATE TYPE "LifecycleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OBSOLETE', 'REPLACED');

-- CreateEnum
CREATE TYPE "StockCountStatus" AS ENUM ('OPEN', 'REVIEW', 'APPROVED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "product_barcodes" DROP CONSTRAINT "product_barcodes_product_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "customers_customer_code_key";

-- DropIndex
DROP INDEX IF EXISTS "product_barcodes_barcode_value_idx";

-- DropIndex
DROP INDEX IF EXISTS "product_barcodes_company_id_barcode_value_key";

-- DropIndex
DROP INDEX IF EXISTS "product_barcodes_product_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "shops_company_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "suppliers_display_name_idx";

-- DropIndex
DROP INDEX IF EXISTS "suppliers_gstin_idx";

-- AlterTable (Add company_id; guarded for old name audit_log and new audit_logs)
DO $$ BEGIN
  -- legacy table name (pre-rename environments)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_log') THEN
    ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "company_id" UUID;
    UPDATE "audit_log" al SET "company_id" = s."company_id"
      FROM "users" u JOIN "shops" s ON u."shop_id" = s."id"
      WHERE al."user_id" = u."id" AND s."company_id" IS NOT NULL AND al."company_id" IS NULL;
    UPDATE "audit_log" SET "company_id" = (SELECT "id" FROM "companies" LIMIT 1)
      WHERE "company_id" IS NULL;
    UPDATE "audit_log" SET "company_id" = '00000000-0000-0000-0000-000000000000'
      WHERE "company_id" IS NULL;
  END IF;
  -- renamed table (post-rename environments; company_id already added by drift-repair migration)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_logs') THEN
    ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "company_id" UUID;
    UPDATE "audit_logs" al SET "company_id" = s."company_id"
      FROM "users" u JOIN "shops" s ON u."shop_id" = s."id"
      WHERE al."user_id" = u."id" AND s."company_id" IS NOT NULL AND al."company_id" IS NULL;
  END IF;
END $$;

-- AlterTable backup_jobs
ALTER TABLE "backup_jobs" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6),
ADD COLUMN     "deleted_by" UUID,
ADD COLUMN     "lifecycle_status" "LifecycleStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable document_email_outbox
ALTER TABLE "document_email_outbox" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable email_delivery_log
ALTER TABLE "email_delivery_log" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable goods_issue_header
ALTER TABLE "goods_issue_header" ALTER COLUMN "issue_type" DROP DEFAULT;

-- AlterTable lifecycle_campaign_enrollments
ALTER TABLE "lifecycle_campaign_enrollments" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable po_cancel_verifications
ALTER TABLE "po_cancel_verifications" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable product_barcodes (Rename column barcode_value to barcode, then alter other fields)
ALTER TABLE "product_barcodes" RENAME COLUMN "barcode_value" TO "barcode";
ALTER TABLE "product_barcodes" 
DROP COLUMN "created_by",
DROP COLUMN "last_scanned_at",
DROP COLUMN "scan_count",
ADD COLUMN     "supplier_id" UUID,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "company_id" DROP NOT NULL,
ALTER COLUMN "barcode_type" SET DEFAULT 'INTERNAL';

-- AlterTable scan_logs
ALTER TABLE "scan_logs" ADD COLUMN     "session_id" UUID;

-- AlterTable stock_transfer_header
ALTER TABLE "stock_transfer_header" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable stock_transfer_items
ALTER TABLE "stock_transfer_items" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable supplier_bill_header
ALTER TABLE "supplier_bill_header" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable supplier_bill_items
ALTER TABLE "supplier_bill_items" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable supplier_payments
ALTER TABLE "supplier_payments" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable supplier_return_images
ALTER TABLE "supplier_return_images" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable suppliers
ALTER TABLE "suppliers" DROP COLUMN "company_name",
DROP COLUMN "currency",
DROP COLUMN "display_name",
DROP COLUMN "first_name",
DROP COLUMN "gst_treatment",
DROP COLUMN "gstin",
DROP COLUMN "language",
DROP COLUMN "last_name",
DROP COLUMN "mobile_phone",
DROP COLUMN "msme_registered",
DROP COLUMN "pan",
DROP COLUMN "remarks",
DROP COLUMN "salutation",
DROP COLUMN "source_of_supply",
DROP COLUMN "tds_section",
DROP COLUMN "work_phone";

-- DropEnum
DROP TYPE IF EXISTS "GstTreatment";

-- Drop supplier_addresses table before dropping the enum it depends on (table removed from schema)
DROP TABLE IF EXISTS "supplier_addresses";

-- DropEnum
DROP TYPE IF EXISTS "SupplierAddressType";

-- CreateTable
CREATE TABLE "barcode_template_versions" (
    "id" UUID NOT NULL,
    "template_name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "json_content" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "barcode_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barcode_print_jobs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "pdf_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "quantities" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "label_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "barcode_print_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_retention_config" (
    "id" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "retain_days" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "data_retention_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_count_sessions" (
    "id" UUID NOT NULL,
    "session_number" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "status" "StockCountStatus" NOT NULL DEFAULT 'OPEN',
    "remarks" TEXT,
    "started_by" UUID NOT NULL,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stock_count_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_count_items" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "counted_qty" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "expected_qty" DECIMAL(12,3),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stock_count_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_audit_log" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barcode_audit_logs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "barcode_id" UUID,
    "barcode" TEXT NOT NULL,
    "product_id" UUID,
    "action" TEXT NOT NULL,
    "detail" JSONB,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barcode_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barcode_history" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "barcode" TEXT NOT NULL,
    "old_product_id" UUID,
    "new_product_id" UUID,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "barcode_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "barcode_template_versions_template_name_version_key" ON "barcode_template_versions"("template_name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "data_retention_config_entity_key" ON "data_retention_config"("entity");

-- CreateIndex
CREATE UNIQUE INDEX "stock_count_sessions_session_number_key" ON "stock_count_sessions"("session_number");

-- CreateIndex
CREATE INDEX "stock_count_sessions_company_id_status_idx" ON "stock_count_sessions"("company_id", "status");

-- CreateIndex
CREATE INDEX "stock_count_sessions_shop_id_idx" ON "stock_count_sessions"("shop_id");

-- CreateIndex
CREATE INDEX "stock_count_items_product_id_idx" ON "stock_count_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_count_items_session_id_product_id_key" ON "stock_count_items"("session_id", "product_id");

-- CreateIndex
CREATE INDEX "platform_audit_log_user_id_created_at_idx" ON "platform_audit_log"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "platform_audit_log_entity_type_entity_id_idx" ON "platform_audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "platform_audit_log_created_at_idx" ON "platform_audit_log"("created_at");

-- CreateIndex
CREATE INDEX "company_settings_company_id_idx" ON "company_settings"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_settings_company_id_key_key" ON "company_settings"("company_id", "key");

-- CreateIndex
CREATE INDEX "barcode_audit_logs_company_id_created_at_idx" ON "barcode_audit_logs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "barcode_audit_logs_barcode_id_idx" ON "barcode_audit_logs"("barcode_id");

-- CreateIndex
CREATE INDEX "barcode_audit_logs_product_id_idx" ON "barcode_audit_logs"("product_id");

-- CreateIndex
CREATE INDEX "barcode_history_company_id_created_at_idx" ON "barcode_history"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "barcode_history_barcode_idx" ON "barcode_history"("barcode");

-- CreateIndex
CREATE INDEX "product_barcodes_supplier_id_idx" ON "product_barcodes"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_barcodes_company_id_barcode_key" ON "product_barcodes"("company_id", "barcode");

-- CreateIndex
CREATE INDEX "scan_logs_session_id_idx" ON "scan_logs"("session_id");

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "stock_count_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_audit_log" ADD CONSTRAINT "platform_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_audit_logs" ADD CONSTRAINT "barcode_audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_history" ADD CONSTRAINT "barcode_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
