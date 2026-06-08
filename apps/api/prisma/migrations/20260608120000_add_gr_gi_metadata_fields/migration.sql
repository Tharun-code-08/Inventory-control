-- Add metadata fields to Goods Receipt Header
ALTER TABLE "goods_receipt_header"
  ADD COLUMN IF NOT EXISTS "receipt_type" TEXT NOT NULL DEFAULT 'FULL',
  ADD COLUMN IF NOT EXISTS "receipt_source" TEXT NOT NULL DEFAULT 'PURCHASE_ORDER',
  ADD COLUMN IF NOT EXISTS "inward_shift" TEXT;

-- Add metadata fields to Goods Issue Header  
ALTER TABLE "goods_issue_header"
  ADD COLUMN IF NOT EXISTS "issue_type" TEXT NOT NULL DEFAULT 'Other',
  ADD COLUMN IF NOT EXISTS "other_reason" TEXT;

-- Migrate existing issue_reason values to issue_type if issue_type is still null
UPDATE "goods_issue_header" 
SET "issue_type" = "issue_reason" 
WHERE "issue_type" IS NULL OR "issue_type" = 'Other';
