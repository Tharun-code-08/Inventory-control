-- Add editable description and category on PO line items
ALTER TABLE "purchase_order_items"
ADD COLUMN IF NOT EXISTS "line_description" TEXT,
ADD COLUMN IF NOT EXISTS "line_category" TEXT;
