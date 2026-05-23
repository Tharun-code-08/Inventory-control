-- Phase 3 (performance): hot-path indexes for shop+date+status filters and FK joins.
-- All indexes use IF NOT EXISTS so re-runs are safe.

-- Backfill missing FK to purchase orders on goods receipts for environments
-- that were missing this column in earlier deployments.
ALTER TABLE "goods_receipt_header"
  ADD COLUMN IF NOT EXISTS "purchase_order_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'goods_receipt_header_purchase_order_id_fkey'
  ) THEN
    ALTER TABLE "goods_receipt_header"
      ADD CONSTRAINT "goods_receipt_header_purchase_order_id_fkey"
      FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_order_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- goods_receipt_header
CREATE INDEX IF NOT EXISTS "goods_receipt_header_shop_id_gr_date_idx"
  ON "goods_receipt_header" ("shop_id", "gr_date");
CREATE INDEX IF NOT EXISTS "goods_receipt_header_shop_id_status_gr_date_idx"
  ON "goods_receipt_header" ("shop_id", "status", "gr_date");
CREATE INDEX IF NOT EXISTS "goods_receipt_header_purchase_order_id_idx"
  ON "goods_receipt_header" ("purchase_order_id");

-- goods_receipt_items
CREATE INDEX IF NOT EXISTS "goods_receipt_items_gr_header_id_idx"
  ON "goods_receipt_items" ("gr_header_id");
CREATE INDEX IF NOT EXISTS "goods_receipt_items_product_id_idx"
  ON "goods_receipt_items" ("product_id");

-- goods_issue_header
CREATE INDEX IF NOT EXISTS "goods_issue_header_shop_id_gi_date_idx"
  ON "goods_issue_header" ("shop_id", "gi_date");
CREATE INDEX IF NOT EXISTS "goods_issue_header_shop_id_status_gi_date_idx"
  ON "goods_issue_header" ("shop_id", "status", "gi_date");

-- goods_issue_items
CREATE INDEX IF NOT EXISTS "goods_issue_items_gi_header_id_idx"
  ON "goods_issue_items" ("gi_header_id");
CREATE INDEX IF NOT EXISTS "goods_issue_items_product_id_idx"
  ON "goods_issue_items" ("product_id");

-- damaged_stock
CREATE INDEX IF NOT EXISTS "damaged_stock_shop_id_damage_date_idx"
  ON "damaged_stock" ("shop_id", "damage_date");
CREATE INDEX IF NOT EXISTS "damaged_stock_shop_id_product_id_idx"
  ON "damaged_stock" ("shop_id", "product_id");
CREATE INDEX IF NOT EXISTS "damaged_stock_status_damage_date_idx"
  ON "damaged_stock" ("status", "damage_date");

-- purchase_order_header
ALTER TABLE "purchase_order_header"
  ADD COLUMN IF NOT EXISTS "contract_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'purchase_order_header_contract_id_fkey'
  ) THEN
    ALTER TABLE "purchase_order_header"
      ADD CONSTRAINT "purchase_order_header_contract_id_fkey"
      FOREIGN KEY ("contract_id") REFERENCES "contract_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "purchase_order_header_shop_id_po_date_idx"
  ON "purchase_order_header" ("shop_id", "po_date");
CREATE INDEX IF NOT EXISTS "purchase_order_header_shop_id_status_idx"
  ON "purchase_order_header" ("shop_id", "status");
CREATE INDEX IF NOT EXISTS "purchase_order_header_contract_id_idx"
  ON "purchase_order_header" ("contract_id");

-- purchase_order_items
CREATE INDEX IF NOT EXISTS "purchase_order_items_po_header_id_idx"
  ON "purchase_order_items" ("po_header_id");
CREATE INDEX IF NOT EXISTS "purchase_order_items_product_id_idx"
  ON "purchase_order_items" ("product_id");

-- invoice_header
CREATE INDEX IF NOT EXISTS "invoice_header_shop_id_status_invoice_date_idx"
  ON "invoice_header" ("shop_id", "status", "invoice_date");
CREATE INDEX IF NOT EXISTS "invoice_header_sales_order_id_idx"
  ON "invoice_header" ("sales_order_id");

-- payment_receipts
CREATE INDEX IF NOT EXISTS "payment_receipts_invoice_id_idx"
  ON "payment_receipts" ("invoice_id");

-- audit_log
CREATE INDEX IF NOT EXISTS "audit_log_user_id_created_at_idx"
  ON "audit_log" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "audit_log_entity_type_entity_id_idx"
  ON "audit_log" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "audit_log_created_at_idx"
  ON "audit_log" ("created_at");
