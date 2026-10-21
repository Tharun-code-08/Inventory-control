-- Supplier codes were unique across all tenants, but auto codes are numbered
-- per company (SUP-0001, ...), so every new tenant's first supplier collided.
-- Make the code unique within a company instead.
ALTER TABLE "suppliers" DROP CONSTRAINT IF EXISTS "suppliers_supplier_code_key";
DROP INDEX IF EXISTS "suppliers_supplier_code_key";
CREATE UNIQUE INDEX IF NOT EXISTS "suppliers_company_id_supplier_code_key" ON "suppliers"("company_id", "supplier_code");
