-- CreateEnum for EwaySubType
CREATE TYPE "EwaySubType" AS ENUM ('SUPPLY', 'EXPORT', 'IMPORT', 'JOB_WORK', 'SKD_CKD', 'RECIPIENT_NOT_KNOWN', 'LINE_SALES', 'SALES_RETURN', 'EXHIBITION', 'OTHERS');

-- CreateEnum for EwayTransactionType
CREATE TYPE "EwayTransactionType" AS ENUM ('REGULAR', 'BILL_TO_SHIP_TO', 'BILL_FROM_DISPATCH_FROM', 'COMBINATION');

-- CreateEnum for EwayDocumentType
CREATE TYPE "EwayDocumentType" AS ENUM ('TAX_INVOICE', 'BILL_OF_SUPPLY', 'DELIVERY_CHALLAN', 'CREDIT_NOTE', 'BILL_OF_ENTRY', 'OTHERS');

-- CreateEnum for EwayVehicleType
CREATE TYPE "EwayVehicleType" AS ENUM ('REGULAR', 'ODC');

-- Create eway_bills table
CREATE TABLE "eway_bills" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "eway_bill_number" text NOT NULL,
  "shop_id" uuid NOT NULL,
  "invoice_id" uuid,
  "sales_order_id" uuid,
  "customer_id" uuid,
  "status" "EwayBillStatus" NOT NULL DEFAULT 'DRAFT',
  "supply_type" "EwaySupplyType" NOT NULL DEFAULT 'OUTWARD',
  "sub_type" "EwaySubType" NOT NULL DEFAULT 'SUPPLY',
  "transaction_type" "EwayTransactionType" NOT NULL DEFAULT 'REGULAR',
  "document_type" "EwayDocumentType" NOT NULL DEFAULT 'TAX_INVOICE',
  "document_number" text NOT NULL,
  "document_date" date NOT NULL,
  "from_gstin" text,
  "from_name" text NOT NULL,
  "from_address1" text,
  "from_address2" text,
  "from_place" text,
  "from_pincode" text,
  "from_state_code" text,
  "to_gstin" text,
  "to_name" text NOT NULL,
  "to_address1" text,
  "to_address2" text,
  "to_place" text,
  "to_pincode" text,
  "to_state_code" text,
  "transporter_gstin" text,
  "transporter_name" text,
  "transporter_id" text,
  "transport_mode" "EwayTransportMode" NOT NULL DEFAULT 'ROAD',
  "trans_doc_number" text,
  "trans_doc_date" date,
  "vehicle_number" text,
  "vehicle_type" "EwayVehicleType" NOT NULL DEFAULT 'REGULAR',
  "distance_km" integer,
  "taxable_value" numeric(14,2) NOT NULL DEFAULT 0,
  "cgst_value" numeric(14,2) NOT NULL DEFAULT 0,
  "sgst_value" numeric(14,2) NOT NULL DEFAULT 0,
  "igst_value" numeric(14,2) NOT NULL DEFAULT 0,
  "cess_value" numeric(14,2) NOT NULL DEFAULT 0,
  "total_value" numeric(14,2) NOT NULL DEFAULT 0,
  "valid_upto" timestamp(6),
  "generated_at" timestamp(6),
  "cancelled_at" timestamp(6),
  "cancel_reason" text,
  "remarks" text,
  "created_at" timestamp(6) NOT NULL DEFAULT now(),
  "updated_at" timestamp(6) NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid,
  CONSTRAINT "eway_bills_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eway_bills_eway_bill_number_key" UNIQUE ("eway_bill_number"),
  CONSTRAINT "eway_bills_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id")
);

-- Create eway_bill_items table
CREATE TABLE "eway_bill_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "eway_bill_id" uuid NOT NULL,
  "product_id" uuid,
  "product_name" text NOT NULL,
  "description" text,
  "hsn_code" text NOT NULL,
  "quantity" numeric(14,3) NOT NULL,
  "unit" text NOT NULL DEFAULT 'PCS',
  "taxable_amount" numeric(14,2) NOT NULL,
  "gst_rate" numeric(5,2) NOT NULL,
  "cgst" numeric(14,2) NOT NULL DEFAULT 0,
  "sgst" numeric(14,2) NOT NULL DEFAULT 0,
  "igst" numeric(14,2) NOT NULL DEFAULT 0,
  "cess" numeric(14,2) NOT NULL DEFAULT 0,
  "total" numeric(14,2) NOT NULL,
  CONSTRAINT "eway_bill_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eway_bill_items_eway_bill_id_fkey" FOREIGN KEY ("eway_bill_id") REFERENCES "eway_bills"("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX "eway_bills_shop_id_document_date_idx" ON "eway_bills"("shop_id", "document_date");
CREATE INDEX "eway_bills_shop_id_status_idx" ON "eway_bills"("shop_id", "status");
CREATE INDEX "eway_bills_invoice_id_idx" ON "eway_bills"("invoice_id");
CREATE INDEX "eway_bills_customer_id_idx" ON "eway_bills"("customer_id");
CREATE INDEX "eway_bill_items_eway_bill_id_idx" ON "eway_bill_items"("eway_bill_id");
