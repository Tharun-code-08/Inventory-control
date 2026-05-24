-- Add RFQ linkage to purchase orders and items

ALTER TABLE "purchase_order_header"
ADD COLUMN IF NOT EXISTS "rfq_id" UUID;

CREATE INDEX IF NOT EXISTS "purchase_order_header_rfq_id_idx"
  ON "purchase_order_header" ("rfq_id");

ALTER TABLE "purchase_order_header"
ADD CONSTRAINT "purchase_order_header_rfq_id_fkey"
FOREIGN KEY ("rfq_id") REFERENCES "rfq_header"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_order_items"
ADD COLUMN IF NOT EXISTS "rfq_item_id" UUID;

CREATE INDEX IF NOT EXISTS "purchase_order_items_rfq_item_id_idx"
  ON "purchase_order_items" ("rfq_item_id");

ALTER TABLE "purchase_order_items"
ADD CONSTRAINT "purchase_order_items_rfq_item_id_fkey"
FOREIGN KEY ("rfq_item_id") REFERENCES "rfq_items"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
