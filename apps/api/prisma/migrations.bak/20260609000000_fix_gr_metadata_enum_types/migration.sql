-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ReceiptType" AS ENUM ('FULL', 'PARTIAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ReceiptSource" AS ENUM ('PURCHASE_ORDER', 'OUTSIDE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "InwardShift" AS ENUM ('DAY_SHIFT', 'NIGHT_SHIFT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
-- Temporary drop defaults to change column types safely
ALTER TABLE "goods_receipt_header" ALTER COLUMN "receipt_type" DROP DEFAULT;
ALTER TABLE "goods_receipt_header" ALTER COLUMN "receipt_source" DROP DEFAULT;

-- Alter columns to use enums
ALTER TABLE "goods_receipt_header" 
  ALTER COLUMN "receipt_type" TYPE "ReceiptType" USING ("receipt_type"::"ReceiptType"),
  ALTER COLUMN "receipt_source" TYPE "ReceiptSource" USING ("receipt_source"::"ReceiptSource"),
  ALTER COLUMN "inward_shift" TYPE "InwardShift" USING ("inward_shift"::"InwardShift");

-- Restore defaults
ALTER TABLE "goods_receipt_header" ALTER COLUMN "receipt_type" SET DEFAULT 'FULL';
ALTER TABLE "goods_receipt_header" ALTER COLUMN "receipt_source" SET DEFAULT 'PURCHASE_ORDER';
