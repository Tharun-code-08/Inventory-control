-- Supplier return acknowledgement flow
-- Safely handles if supplier_returns table doesn't exist yet
DO $$ BEGIN
  IF to_regclass('public.supplier_returns') IS NOT NULL THEN
    -- Only add columns if table exists
    ALTER TABLE supplier_returns
      ADD COLUMN IF NOT EXISTS acknowledgement_status TEXT,
      ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
  END IF;
END $$;
