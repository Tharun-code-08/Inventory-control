-- CreateEnum
CREATE TYPE "EwayBillStatus" AS ENUM ('DRAFT', 'GENERATED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EwaySupplyType" AS ENUM ('OUTWARD', 'INWARD');

-- CreateEnum
CREATE TYPE "EwayTransportMode" AS ENUM ('ROAD', 'RAIL', 'AIR', 'SHIP');

-- CreateTable
CREATE TABLE "eway_bills" (
    "id" UUID NOT NULL,
    "eway_bill_number" TEXT NOT NULL,
    "shop_id" UUID NOT NULL,
    "invoice_id" UUID,
    "status" "EwayBillStatus" NOT NULL DEFAULT 'DRAFT',
    "supply_type" "EwaySupplyType" NOT NULL DEFAULT 'OUTWARD',
    "document_type" TEXT NOT NULL DEFAULT 'TAX_INVOICE',
    "document_number" TEXT NOT NULL,
    "document_date" DATE NOT NULL,
    "from_gstin" TEXT,
    "from_name" TEXT NOT NULL,
    "from_address" TEXT,
    "from_place" TEXT,
    "from_pincode" TEXT,
    "from_state_code" TEXT,
    "to_gstin" TEXT,
    "to_name" TEXT NOT NULL,
    "to_address" TEXT,
    "to_place" TEXT,
    "to_pincode" TEXT,
    "to_state_code" TEXT,
    "transporter_name" TEXT,
    "transporter_id" TEXT,
    "transport_mode" "EwayTransportMode" NOT NULL DEFAULT 'ROAD',
    "vehicle_number" TEXT,
    "distance_km" INTEGER,
    "trans_doc_number" TEXT,
    "trans_doc_date" DATE,
    "taxable_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cgst_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sgst_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "igst_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cess_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "hsn_summary" JSONB,
    "valid_upto" TIMESTAMPTZ(6),
    "generated_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancel_reason" TEXT,
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "eway_bills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "eway_bills_eway_bill_number_key" ON "eway_bills"("eway_bill_number");

-- CreateIndex
CREATE INDEX "eway_bills_shop_id_document_date_idx" ON "eway_bills"("shop_id", "document_date");

-- CreateIndex
CREATE INDEX "eway_bills_shop_id_status_idx" ON "eway_bills"("shop_id", "status");

-- CreateIndex
CREATE INDEX "eway_bills_invoice_id_idx" ON "eway_bills"("invoice_id");

-- AddForeignKey
ALTER TABLE "eway_bills" ADD CONSTRAINT "eway_bills_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eway_bills" ADD CONSTRAINT "eway_bills_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;
