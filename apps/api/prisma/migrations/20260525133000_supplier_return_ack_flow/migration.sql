DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'SupplierReturnReasonCode' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "SupplierReturnReasonCode" AS ENUM ('DAMAGED', 'WRONG_ITEM', 'EXPIRED', 'EXCESS');
  END IF;
END $$;

ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED';
ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'DONE';

ALTER TABLE "supplier_returns"
  ADD COLUMN IF NOT EXISTS "supplier_id" UUID,
  ADD COLUMN IF NOT EXISTS "goods_receipt_id" UUID,
  ADD COLUMN IF NOT EXISTS "supplier_ref" TEXT,
  ADD COLUMN IF NOT EXISTS "internal_cc_email" TEXT,
  ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "acknowledged_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "email_sent_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "ack_token_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "email_message_id" TEXT;

ALTER TABLE "supplier_return_items"
  ADD COLUMN IF NOT EXISTS "goods_receipt_item_id" UUID,
  ADD COLUMN IF NOT EXISTS "grn_quantity" DECIMAL(12, 3),
  ADD COLUMN IF NOT EXISTS "reason_code" "SupplierReturnReasonCode";

CREATE TABLE IF NOT EXISTS "supplier_return_images" (
  "id" UUID NOT NULL,
  "return_id" UUID NOT NULL,
  "return_item_id" UUID,
  "file_path" TEXT NOT NULL,
  "public_url" TEXT NOT NULL,
  "original_filename" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  CONSTRAINT "supplier_return_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "supplier_returns_supplier_id_idx" ON "supplier_returns" ("supplier_id");
CREATE INDEX IF NOT EXISTS "supplier_returns_goods_receipt_id_idx" ON "supplier_returns" ("goods_receipt_id");
CREATE INDEX IF NOT EXISTS "supplier_return_items_goods_receipt_item_id_idx" ON "supplier_return_items" ("goods_receipt_item_id");
CREATE INDEX IF NOT EXISTS "supplier_return_images_return_id_idx" ON "supplier_return_images" ("return_id");
CREATE INDEX IF NOT EXISTS "supplier_return_images_return_item_id_idx" ON "supplier_return_images" ("return_item_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplier_returns_supplier_id_fkey'
  ) THEN
    ALTER TABLE "supplier_returns"
      ADD CONSTRAINT "supplier_returns_supplier_id_fkey"
      FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplier_returns_goods_receipt_id_fkey'
  ) THEN
    ALTER TABLE "supplier_returns"
      ADD CONSTRAINT "supplier_returns_goods_receipt_id_fkey"
      FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipt_header"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplier_return_items_goods_receipt_item_id_fkey'
  ) THEN
    ALTER TABLE "supplier_return_items"
      ADD CONSTRAINT "supplier_return_items_goods_receipt_item_id_fkey"
      FOREIGN KEY ("goods_receipt_item_id") REFERENCES "goods_receipt_items"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplier_return_images_return_id_fkey'
  ) THEN
    ALTER TABLE "supplier_return_images"
      ADD CONSTRAINT "supplier_return_images_return_id_fkey"
      FOREIGN KEY ("return_id") REFERENCES "supplier_returns"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplier_return_images_return_item_id_fkey'
  ) THEN
    ALTER TABLE "supplier_return_images"
      ADD CONSTRAINT "supplier_return_images_return_item_id_fkey"
      FOREIGN KEY ("return_item_id") REFERENCES "supplier_return_items"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
