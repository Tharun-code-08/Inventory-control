-- Treat an empty app.current_company_id the same as an unset one.
--
-- set_config('app.current_company_id', ..., true) is transaction-local. Once a
-- pooled connection has used it, current_setting(..., true) returns '' (not
-- NULL) on that connection afterwards, so the existing policies evaluated
-- ''::uuid and failed with "invalid input syntax for type uuid". Wrapping the
-- setting in NULLIF(..., '') makes those connections behave like a fresh one.
--
-- Every policy that reads the setting is rewritten in place so this stays in
-- sync with however many tenant policies earlier migrations created.
DO $$
DECLARE
  pol record;
  new_qual text;
  new_check text;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE qual LIKE '%app.current_company_id%'
       OR with_check LIKE '%app.current_company_id%'
  LOOP
    new_qual := replace(
      pol.qual,
      'current_setting(''app.current_company_id''::text, true)',
      'NULLIF(current_setting(''app.current_company_id''::text, true), '''')'
    );
    new_check := replace(
      pol.with_check,
      'current_setting(''app.current_company_id''::text, true)',
      'NULLIF(current_setting(''app.current_company_id''::text, true), '''')'
    );
    IF new_qual IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)',
        pol.policyname, pol.schemaname, pol.tablename, new_qual);
    END IF;
    IF new_check IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
        pol.policyname, pol.schemaname, pol.tablename, new_check);
    END IF;
  END LOOP;
END
$$;
