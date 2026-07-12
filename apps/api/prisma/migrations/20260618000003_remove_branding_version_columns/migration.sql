-- Drop redundant brandingVersion INT columns from document tables
-- The version is now tracked in branding_snapshot.version JSON field
-- Guarded: some tables were renamed between staging and CI fresh-DB; skip if table absent.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rfq_header') THEN
    ALTER TABLE "rfq_header" DROP COLUMN IF EXISTS "branding_version";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goods_receipt_header') THEN
    ALTER TABLE "goods_receipt_header" DROP COLUMN IF EXISTS "branding_version";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goods_issue_header') THEN
    ALTER TABLE "goods_issue_header" DROP COLUMN IF EXISTS "branding_version";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_order_header') THEN
    ALTER TABLE "purchase_order_header" DROP COLUMN IF EXISTS "branding_version";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sales_quotation_header') THEN
    ALTER TABLE "sales_quotation_header" DROP COLUMN IF EXISTS "branding_version";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sales_quote_header') THEN
    ALTER TABLE "sales_quote_header" DROP COLUMN IF EXISTS "branding_version";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sales_order_header') THEN
    ALTER TABLE "sales_order_header" DROP COLUMN IF EXISTS "branding_version";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_header') THEN
    ALTER TABLE "invoice_header" DROP COLUMN IF EXISTS "branding_version";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_receipts') THEN
    ALTER TABLE "payment_receipts" DROP COLUMN IF EXISTS "branding_version";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'supplier_return') THEN
    ALTER TABLE "supplier_return" DROP COLUMN IF EXISTS "branding_version";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'supplier_returns') THEN
    ALTER TABLE "supplier_returns" DROP COLUMN IF EXISTS "branding_version";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'supplier_bill_header') THEN
    ALTER TABLE "supplier_bill_header" DROP COLUMN IF EXISTS "branding_version";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'supplier_payment') THEN
    ALTER TABLE "supplier_payment" DROP COLUMN IF EXISTS "branding_version";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'supplier_payments') THEN
    ALTER TABLE "supplier_payments" DROP COLUMN IF EXISTS "branding_version";
  END IF;
END $$;
