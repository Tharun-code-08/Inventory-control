-- Add batch/serial tracking on goods receipt line items
ALTER TABLE "goods_receipt_items"
  ADD COLUMN IF NOT EXISTS "batch_number" TEXT,
  ADD COLUMN IF NOT EXISTS "serial_number" TEXT;
