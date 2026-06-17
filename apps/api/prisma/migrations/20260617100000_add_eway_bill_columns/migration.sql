-- Add missing columns to eway_bills table
ALTER TABLE "eway_bills" 
  ADD COLUMN IF NOT EXISTS "sales_order_id" UUID,
  ADD COLUMN IF NOT EXISTS "customer_id" UUID,
  ADD COLUMN IF NOT EXISTS "sub_type" "EwaySubType" DEFAULT 'SUPPLY',
  ADD COLUMN IF NOT EXISTS "transaction_type" "EwayTransactionType" DEFAULT 'REGULAR',
  ADD COLUMN IF NOT EXISTS "from_address1" TEXT,
  ADD COLUMN IF NOT EXISTS "from_address2" TEXT,
  ADD COLUMN IF NOT EXISTS "to_address1" TEXT,
  ADD COLUMN IF NOT EXISTS "to_address2" TEXT,
  ADD COLUMN IF NOT EXISTS "transporter_gstin" TEXT,
  ADD COLUMN IF NOT EXISTS "vehicle_type" "EwayVehicleType" DEFAULT 'REGULAR';

-- Migrate document_type from TEXT to ENUM if needed
DO $$ BEGIN
  BEGIN
    ALTER TABLE "eway_bills" 
      ALTER COLUMN "document_type" TYPE "EwayDocumentType" USING "document_type"::"EwayDocumentType";
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- Create eway_bill_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS "eway_bill_items" (
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

-- Create index if not exists
CREATE INDEX IF NOT EXISTS "eway_bill_items_eway_bill_id_idx" ON "eway_bill_items"("eway_bill_id");
