-- Add PAN column to customers (used as PAN in UI)
ALTER TABLE "customers"
ADD COLUMN IF NOT EXISTS "pan" TEXT;
