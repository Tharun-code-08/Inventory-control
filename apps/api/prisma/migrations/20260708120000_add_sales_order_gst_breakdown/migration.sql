-- Sales order GST breakdown (intra-state CGST/SGST; IGST column reserved for Sprint 3)

CREATE TYPE "GstSupplyType" AS ENUM ('INTRA_STATE', 'INTER_STATE');

ALTER TABLE "sales_order_header"
  ADD COLUMN IF NOT EXISTS "gst_supply_type" "GstSupplyType" NOT NULL DEFAULT 'INTRA_STATE',
  ADD COLUMN IF NOT EXISTS "subtotal_before_tax" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_cgst" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "total_sgst" DECIMAL(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE "sales_order_items"
  ADD COLUMN IF NOT EXISTS "cgst_rate" DECIMAL(7, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sgst_rate" DECIMAL(7, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "igst_rate" DECIMAL(7, 4) NOT NULL DEFAULT 0;

-- Backfill CGST/SGST from existing combined tax_rate (percent = rate * 100, split 50/50)
UPDATE "sales_order_items"
SET
  "cgst_rate" = ROUND(("tax_rate" * 100) / 2, 4),
  "sgst_rate" = ROUND(("tax_rate" * 100) / 2, 4)
WHERE "tax_rate" > 0;

UPDATE "sales_order_header" h
SET
  "subtotal_before_tax" = COALESCE((
    SELECT SUM(i."line_value" - i."tax_amount")
    FROM "sales_order_items" i
    WHERE i."so_header_id" = h."id"
  ), 0),
  "total_cgst" = ROUND(h."tax_amount" / 2, 2),
  "total_sgst" = ROUND(h."tax_amount" / 2, 2)
WHERE h."tax_amount" > 0;
