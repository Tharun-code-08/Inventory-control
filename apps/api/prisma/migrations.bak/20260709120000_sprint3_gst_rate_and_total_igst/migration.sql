-- Sprint 3: product default GST rate + sales order IGST header total

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "gst_rate" DECIMAL(7, 4) NOT NULL DEFAULT 0;

ALTER TABLE "sales_order_header"
  ADD COLUMN IF NOT EXISTS "total_igst" DECIMAL(14, 2) NOT NULL DEFAULT 0;
