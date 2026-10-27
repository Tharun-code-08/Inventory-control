-- Force tenant-policy tables through RLS and require explicit system access
-- for policies that otherwise bypass tenant scoping when the setting is empty.
DO $$
DECLARE
  pol record;
  new_qual text;
  new_check text;
  policy_count integer := 0;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    new_qual := CASE
      WHEN pol.qual IS NULL THEN NULL
      ELSE regexp_replace(
        pol.qual,
        $pattern$(NULLIF\()?current_setting\('app\.current_company_id'(::text)?, true\)(, ''(::text)?\))? IS NULL$pattern$,
        $replacement$current_setting('app.allow_unscoped_access', true) = 'true'$replacement$,
        'g'
      )
    END;
    new_check := CASE
      WHEN pol.with_check IS NULL THEN NULL
      ELSE regexp_replace(
        pol.with_check,
        $pattern$(NULLIF\()?current_setting\('app\.current_company_id'(::text)?, true\)(, ''(::text)?\))? IS NULL$pattern$,
        $replacement$current_setting('app.allow_unscoped_access', true) = 'true'$replacement$,
        'g'
      )
    END;

    IF pol.qual LIKE '%app.current_company_id%'
       OR pol.with_check LIKE '%app.current_company_id%' THEN
      EXECUTE format(
        'ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY',
        pol.schemaname, pol.tablename
      );

      IF new_qual IS NOT NULL
         AND position('app.allow_unscoped_access' IN new_qual) = 0 THEN
        new_qual := format(
          '(current_setting(''app.allow_unscoped_access'', true) = ''true'' OR (%s))',
          new_qual
        );
      END IF;
      IF new_check IS NOT NULL
         AND position('app.allow_unscoped_access' IN new_check) = 0 THEN
        new_check := format(
          '(current_setting(''app.allow_unscoped_access'', true) = ''true'' OR (%s))',
          new_check
        );
      END IF;
    END IF;

    IF new_qual IS NOT DISTINCT FROM pol.qual
       AND new_check IS NOT DISTINCT FROM pol.with_check THEN
      CONTINUE;
    END IF;

    IF (new_qual IS DISTINCT FROM pol.qual
        AND position('app.allow_unscoped_access' IN new_qual) = 0)
       OR (new_check IS DISTINCT FROM pol.with_check
        AND position('app.allow_unscoped_access' IN new_check) = 0) THEN
      RAISE EXCEPTION 'Could not make tenant policy %.% fail closed',
        pol.tablename, pol.policyname;
    END IF;

    IF new_qual IS NOT NULL AND new_check IS NOT NULL THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)',
        pol.policyname, pol.schemaname, pol.tablename, new_qual, new_check
      );
    ELSIF new_qual IS NOT NULL THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I USING (%s)',
        pol.policyname, pol.schemaname, pol.tablename, new_qual
      );
    ELSE
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
        pol.policyname, pol.schemaname, pol.tablename, new_check
      );
    END IF;

    policy_count := policy_count + 1;
  END LOOP;

  IF policy_count = 0 THEN
    RAISE EXCEPTION 'No tenant RLS policies were found to harden';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        qual ~ $pattern$(NULLIF\()?current_setting\('app\.current_company_id'(::text)?, true\)(, ''(::text)?\))? IS NULL$pattern$
        OR with_check ~ $pattern$(NULLIF\()?current_setting\('app\.current_company_id'(::text)?, true\)(, ''(::text)?\))? IS NULL$pattern$
      )
  ) THEN
    RAISE EXCEPTION 'A tenant policy still allows access without a company context';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual LIKE '%app.current_company_id%'
          AND qual NOT LIKE '%app.allow_unscoped_access%')
        OR (with_check LIKE '%app.current_company_id%'
          AND with_check NOT LIKE '%app.allow_unscoped_access%')
      )
  ) THEN
    RAISE EXCEPTION 'A tenant policy is missing its explicit system-access branch';
  END IF;
END
$$;
