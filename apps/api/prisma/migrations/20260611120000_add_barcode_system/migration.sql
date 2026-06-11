-- CreateEnum
CREATE TYPE "BarcodeType" AS ENUM ('EAN13', 'UPC_A', 'CODE128', 'CODE39', 'QR', 'INTERNAL');

-- CreateEnum
CREATE TYPE "ScanAction" AS ENUM ('LOOKUP', 'GOODS_RECEIPT', 'GOODS_ISSUE', 'STOCK_COUNT', 'SALES_ORDER', 'PURCHASE_ORDER', 'STOCK_TRANSFER');

-- CreateEnum
CREATE TYPE "ScanResult" AS ENUM ('FOUND', 'NOT_FOUND', 'INVALID');

-- CreateTable
CREATE TABLE "product_barcodes" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "barcode_value" TEXT NOT NULL,
    "barcode_type" "BarcodeType" NOT NULL DEFAULT 'CODE128',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "product_barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_logs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "shop_id" UUID,
    "barcode" TEXT NOT NULL,
    "product_id" UUID,
    "user_id" UUID NOT NULL,
    "action" "ScanAction" NOT NULL DEFAULT 'LOOKUP',
    "result" "ScanResult" NOT NULL DEFAULT 'FOUND',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_barcodes_company_id_barcode_value_key" ON "product_barcodes"("company_id", "barcode_value");

-- CreateIndex
CREATE INDEX "product_barcodes_barcode_value_idx" ON "product_barcodes"("barcode_value");

-- CreateIndex
CREATE INDEX "product_barcodes_product_id_idx" ON "product_barcodes"("product_id");

-- CreateIndex
CREATE INDEX "scan_logs_company_id_created_at_idx" ON "scan_logs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "scan_logs_product_id_idx" ON "scan_logs"("product_id");

-- CreateIndex
CREATE INDEX "scan_logs_barcode_idx" ON "scan_logs"("barcode");

-- AddForeignKey
ALTER TABLE "product_barcodes" ADD CONSTRAINT "product_barcodes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
