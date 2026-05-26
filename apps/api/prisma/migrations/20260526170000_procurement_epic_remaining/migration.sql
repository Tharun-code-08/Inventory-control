-- GR line expiry + storage location
ALTER TABLE "goods_receipt_items" ADD COLUMN IF NOT EXISTS "expiry_date" DATE;
ALTER TABLE "goods_receipt_items" ADD COLUMN IF NOT EXISTS "storage_location_id" UUID;
ALTER TABLE "goods_receipt_items"
  ADD CONSTRAINT "goods_receipt_items_storage_location_id_fkey"
  FOREIGN KEY ("storage_location_id") REFERENCES "storage_locations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "goods_receipt_items_storage_location_id_idx"
  ON "goods_receipt_items"("storage_location_id");

-- Shop-scoped customer codes
ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_customer_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "customers_shop_id_customer_code_key"
  ON "customers"("shop_id", "customer_code");

-- Transaction types for stock transfer
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'STOCK_TRANSFER_OUT';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'STOCK_TRANSFER_IN';

-- Supplier bill status
DO $$ BEGIN
  CREATE TYPE "SupplierBillStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- PO cancel OTP verification
CREATE TABLE IF NOT EXISTS "po_cancel_verifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "po_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "otp_hash" TEXT NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "po_cancel_verifications_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "po_cancel_verifications"
  ADD CONSTRAINT "po_cancel_verifications_po_id_fkey"
  FOREIGN KEY ("po_id") REFERENCES "purchase_order_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "po_cancel_verifications_po_id_user_id_idx"
  ON "po_cancel_verifications"("po_id", "user_id");
CREATE INDEX IF NOT EXISTS "po_cancel_verifications_expires_at_idx"
  ON "po_cancel_verifications"("expires_at");

-- Supplier bills (AP)
CREATE TABLE IF NOT EXISTS "supplier_bill_header" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "bill_number" TEXT NOT NULL,
  "bill_date" DATE NOT NULL,
  "due_date" DATE,
  "shop_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "purchase_order_id" UUID,
  "goods_receipt_id" UUID,
  "status" "SupplierBillStatus" NOT NULL DEFAULT 'DRAFT',
  "total_value" DECIMAL(14,2) NOT NULL,
  "paid_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "remarks" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_by" UUID,
  CONSTRAINT "supplier_bill_header_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_bill_header_bill_number_key" ON "supplier_bill_header"("bill_number");
ALTER TABLE "supplier_bill_header"
  ADD CONSTRAINT "supplier_bill_header_shop_id_fkey"
  FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_bill_header"
  ADD CONSTRAINT "supplier_bill_header_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_bill_header"
  ADD CONSTRAINT "supplier_bill_header_purchase_order_id_fkey"
  FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_order_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "supplier_bill_header"
  ADD CONSTRAINT "supplier_bill_header_goods_receipt_id_fkey"
  FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipt_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "supplier_bill_header_shop_id_bill_date_idx"
  ON "supplier_bill_header"("shop_id", "bill_date");
CREATE INDEX IF NOT EXISTS "supplier_bill_header_shop_id_status_bill_date_idx"
  ON "supplier_bill_header"("shop_id", "status", "bill_date");
CREATE INDEX IF NOT EXISTS "supplier_bill_header_supplier_id_idx" ON "supplier_bill_header"("supplier_id");
CREATE INDEX IF NOT EXISTS "supplier_bill_header_purchase_order_id_idx" ON "supplier_bill_header"("purchase_order_id");
CREATE INDEX IF NOT EXISTS "supplier_bill_header_goods_receipt_id_idx" ON "supplier_bill_header"("goods_receipt_id");

CREATE TABLE IF NOT EXISTS "supplier_bill_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "bill_header_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "uom" TEXT NOT NULL,
  "unit_cost" DECIMAL(12,2) NOT NULL,
  "line_value" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "supplier_bill_items_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "supplier_bill_items"
  ADD CONSTRAINT "supplier_bill_items_bill_header_id_fkey"
  FOREIGN KEY ("bill_header_id") REFERENCES "supplier_bill_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_bill_items"
  ADD CONSTRAINT "supplier_bill_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "supplier_bill_items_bill_header_id_idx" ON "supplier_bill_items"("bill_header_id");

CREATE TABLE IF NOT EXISTS "supplier_payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_number" TEXT NOT NULL,
  "payment_date" DATE NOT NULL,
  "supplier_bill_id" UUID NOT NULL,
  "shop_id" UUID NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "method" TEXT,
  "reference" TEXT,
  "remarks" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_by" UUID,
  CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_payments_payment_number_key" ON "supplier_payments"("payment_number");
ALTER TABLE "supplier_payments"
  ADD CONSTRAINT "supplier_payments_supplier_bill_id_fkey"
  FOREIGN KEY ("supplier_bill_id") REFERENCES "supplier_bill_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_payments"
  ADD CONSTRAINT "supplier_payments_shop_id_fkey"
  FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "supplier_payments_shop_id_payment_date_idx" ON "supplier_payments"("shop_id", "payment_date");
CREATE INDEX IF NOT EXISTS "supplier_payments_supplier_bill_id_idx" ON "supplier_payments"("supplier_bill_id");

-- Stock transfers
CREATE TABLE IF NOT EXISTS "stock_transfer_header" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transfer_number" TEXT NOT NULL,
  "transfer_date" DATE NOT NULL,
  "from_shop_id" UUID NOT NULL,
  "to_shop_id" UUID NOT NULL,
  "from_storage_location_id" UUID,
  "to_storage_location_id" UUID,
  "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "posted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_by" UUID,
  CONSTRAINT "stock_transfer_header_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "stock_transfer_header_transfer_number_key" ON "stock_transfer_header"("transfer_number");
ALTER TABLE "stock_transfer_header"
  ADD CONSTRAINT "stock_transfer_header_from_shop_id_fkey"
  FOREIGN KEY ("from_shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_header"
  ADD CONSTRAINT "stock_transfer_header_to_shop_id_fkey"
  FOREIGN KEY ("to_shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_header"
  ADD CONSTRAINT "stock_transfer_header_from_storage_location_id_fkey"
  FOREIGN KEY ("from_storage_location_id") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_header"
  ADD CONSTRAINT "stock_transfer_header_to_storage_location_id_fkey"
  FOREIGN KEY ("to_storage_location_id") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "stock_transfer_header_from_shop_id_transfer_date_idx"
  ON "stock_transfer_header"("from_shop_id", "transfer_date");
CREATE INDEX IF NOT EXISTS "stock_transfer_header_to_shop_id_transfer_date_idx"
  ON "stock_transfer_header"("to_shop_id", "transfer_date");
CREATE INDEX IF NOT EXISTS "stock_transfer_header_status_idx" ON "stock_transfer_header"("status");

CREATE TABLE IF NOT EXISTS "stock_transfer_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transfer_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "uom" TEXT NOT NULL,
  CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "stock_transfer_items"
  ADD CONSTRAINT "stock_transfer_items_transfer_id_fkey"
  FOREIGN KEY ("transfer_id") REFERENCES "stock_transfer_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_items"
  ADD CONSTRAINT "stock_transfer_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "stock_transfer_items_transfer_id_idx" ON "stock_transfer_items"("transfer_id");
