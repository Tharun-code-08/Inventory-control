-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TaxPreference" AS ENUM ('TAXABLE', 'NON_TAXABLE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "brand" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_preference" "TaxPreference" NOT NULL DEFAULT 'TAXABLE';
