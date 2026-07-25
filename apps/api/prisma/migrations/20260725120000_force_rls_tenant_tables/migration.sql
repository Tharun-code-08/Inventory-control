-- Activate FORCE ROW LEVEL SECURITY on the five tables that have tenant-isolation
-- policies defined. Without FORCE, the table owner (retail) bypasses RLS entirely.
-- After this migration the app.current_company_id session variable must be set via
-- TenantRlsInterceptor + PrismaService.$allOperations before any query runs.

ALTER TABLE customers           FORCE ROW LEVEL SECURITY;
ALTER TABLE sales_order_header  FORCE ROW LEVEL SECURITY;
ALTER TABLE shops               FORCE ROW LEVEL SECURITY;
ALTER TABLE storage_locations   FORCE ROW LEVEL SECURITY;
ALTER TABLE suppliers           FORCE ROW LEVEL SECURITY;
