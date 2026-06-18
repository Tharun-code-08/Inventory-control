-- Drop redundant brandingVersion INT columns from document tables
-- The version is now tracked in branding_snapshot.version JSON field

ALTER TABLE "rfq_header" DROP COLUMN IF EXISTS "branding_version";
ALTER TABLE "goods_receipt_header" DROP COLUMN IF EXISTS "branding_version";
ALTER TABLE "goods_issue_header" DROP COLUMN IF EXISTS "branding_version";
ALTER TABLE "purchase_order_header" DROP COLUMN IF EXISTS "branding_version";
ALTER TABLE "sales_quotation_header" DROP COLUMN IF EXISTS "branding_version";
ALTER TABLE "sales_order_header" DROP COLUMN IF EXISTS "branding_version";
ALTER TABLE "invoice_header" DROP COLUMN IF EXISTS "branding_version";
ALTER TABLE "payment_receipts" DROP COLUMN IF EXISTS "branding_version";
ALTER TABLE "supplier_return" DROP COLUMN IF EXISTS "branding_version";
ALTER TABLE "supplier_bill_header" DROP COLUMN IF EXISTS "branding_version";
ALTER TABLE "supplier_payment" DROP COLUMN IF EXISTS "branding_version";
