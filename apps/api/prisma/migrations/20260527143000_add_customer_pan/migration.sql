-- Add PAN column to customers (used as PAN in UI)
DO $$
BEGIN
  IF to_regclass('public.customers') IS NOT NULL THEN
    ALTER TABLE "customers"
      ADD COLUMN IF NOT EXISTS "pan" TEXT;
  END IF;
END $$;
