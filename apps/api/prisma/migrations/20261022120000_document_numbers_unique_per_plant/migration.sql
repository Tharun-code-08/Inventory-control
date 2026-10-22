-- Document numbers were unique across every tenant, but each organisation
-- numbers its documents from 1 (SO-00001, INV-00001, ...), so the second
-- organisation's first document collided with the first one's. Make each number
-- unique within its plant instead; the counter is per organisation, so numbers
-- still never repeat inside one organisation.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('rfq_header', 'rfq_number'),
    ('contract_header', 'contract_number'),
    ('supplier_quote_header', 'quote_number'),
    ('goods_receipt_header', 'gr_number'),
    ('goods_issue_header', 'gi_number'),
    ('damaged_stock', 'damage_number'),
    ('purchase_order_header', 'po_number'),
    ('sales_quote_header', 'quote_number'),
    ('sales_order_header', 'so_number'),
    ('invoice_header', 'invoice_number'),
    ('payment_receipts', 'receipt_number'),
    ('customer_returns', 'return_number'),
    ('supplier_returns', 'return_number'),
    ('credit_notes', 'credit_number'),
    ('supplier_bill_header', 'bill_number'),
    ('supplier_payments', 'payment_number')
  ) AS v(tbl, col)
  LOOP
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = r.tbl || '_' || r.col || '_key') THEN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.tbl, r.tbl || '_' || r.col || '_key');
    ELSE
      EXECUTE format('DROP INDEX IF EXISTS %I', r.tbl || '_' || r.col || '_key');
    END IF;
    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I (shop_id, %I)',
      r.tbl || '_shop_id_' || r.col || '_key', r.tbl, r.col);
  END LOOP;
END $$;

-- Plant scoping is fixed per document type: only stock transfers (whose
-- numbers are still unique across all tenants) carry the plant code.
UPDATE "document_series_config"
SET "shop_scoped" = ("doc_type" = 'ST')
WHERE "shop_scoped" IS DISTINCT FROM ("doc_type" = 'ST');
