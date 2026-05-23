-- CreateEnum
CREATE TYPE "TaxPreference" AS ENUM ('TAXABLE', 'NON_TAXABLE');

-- AlterTable
ALTER TABLE "products"
ADD COLUMN "brand" TEXT,
ADD COLUMN "tax_preference" "TaxPreference" NOT NULL DEFAULT 'TAXABLE';
