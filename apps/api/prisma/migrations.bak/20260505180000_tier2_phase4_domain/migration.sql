-- Safely create enums (skip if they already exist)
DO $$ BEGIN
    CREATE TYPE "CostingMethod" AS ENUM ('AVERAGE', 'FIFO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FulfillmentStatus" AS ENUM ('NONE', 'PARTIAL', 'FULL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ReturnStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add columns to tables safely
DO $$ BEGIN
    IF to_regclass('public.shops') IS NOT NULL THEN
        ALTER TABLE "shops"
          ADD COLUMN IF NOT EXISTS "costing_method" "CostingMethod" NOT NULL DEFAULT 'AVERAGE',
          ADD COLUMN IF NOT EXISTS "functional_currency" TEXT NOT NULL DEFAULT 'USD';
    END IF;
    
    IF to_regclass('public."Shop"') IS NOT NULL THEN
        ALTER TABLE "Shop"
          ADD COLUMN IF NOT EXISTS "costing_method" "CostingMethod" NOT NULL DEFAULT 'AVERAGE',
          ADD COLUMN IF NOT EXISTS "functional_currency" TEXT NOT NULL DEFAULT 'USD';
    END IF;
END $$;
