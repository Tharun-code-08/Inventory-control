-- Apply the NULLIF(app.current_company_id, '') fix from
-- 20260801120000_rls_empty_tenant_setting to policies created after it ran.
--
-- The workflow-engine RLS policies (20260730180000_rls_workflow_engine_tables)
-- sort before that migration, so on a fresh database it already covers them.
-- On databases that had applied 20260801120000 first (production), the engine
-- migrations run afterwards and their policies still compare ''::uuid on
-- pooled connections. Policies that are already wrapped are left untouched,
-- so this is a no-op where the earlier migration covered everything.
DO $$
DECLARE
  pol record;
  setting_expr constant text := 'current_setting(''app.current_company_id''::text, true)';
  wrapped_expr constant text := 'NULLIF(current_setting(''app.current_company_id''::text, true), '''')';
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE (qual LIKE '%app.current_company_id%' OR with_check LIKE '%app.current_company_id%')
      AND coalesce(qual, '') NOT LIKE '%NULLIF(current_setting(''app.current_company_id''%'
      AND coalesce(with_check, '') NOT LIKE '%NULLIF(current_setting(''app.current_company_id''%'
  LOOP
    IF pol.qual IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)',
        pol.policyname, pol.schemaname, pol.tablename, replace(pol.qual, setting_expr, wrapped_expr));
    END IF;
    IF pol.with_check IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
        pol.policyname, pol.schemaname, pol.tablename, replace(pol.with_check, setting_expr, wrapped_expr));
    END IF;
  END LOOP;
END
$$;
