-- Validate eway_bills_invoice_id_fkey (added NOT VALID by 20261028100000_reconcile_schema_drift).
-- VALIDATE does not block reads or writes. If existing rows reference invoices
-- that no longer exist, keep the constraint NOT VALID (it is still enforced for
-- new rows) rather than failing the deploy; clean those rows up and re-run the
-- VALIDATE statement by hand.
DO $$
BEGIN
  ALTER TABLE "eway_bills" VALIDATE CONSTRAINT "eway_bills_invoice_id_fkey";
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE NOTICE 'eway_bills_invoice_id_fkey left NOT VALID: some eway_bills rows reference missing invoices. After cleanup run: ALTER TABLE "eway_bills" VALIDATE CONSTRAINT "eway_bills_invoice_id_fkey";';
END $$;
