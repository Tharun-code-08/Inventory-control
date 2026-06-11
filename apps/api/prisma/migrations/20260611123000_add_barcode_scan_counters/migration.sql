-- AlterTable
ALTER TABLE "product_barcodes" ADD COLUMN "scan_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "last_scanned_at" TIMESTAMPTZ(6);
