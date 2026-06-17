-- Shop profile columns referenced by Prisma schema but missing from init/stub migrations.

ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "tax_id" TEXT;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "company_id" UUID;

CREATE INDEX IF NOT EXISTS "shops_company_id_idx" ON "shops"("company_id");

DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'shops_company_id_fkey'
     ) THEN
    ALTER TABLE "shops"
      ADD CONSTRAINT "shops_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- RLS was skipped in rls_phase1 when company_id did not exist yet.
DO $$
BEGIN
  IF to_regclass('public.shops') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'shops'
         AND column_name = 'company_id'
     )
     AND NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'shops' AND policyname = 'rls_shops_company'
     ) THEN
    ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
    CREATE POLICY rls_shops_company ON shops
      USING (
        current_setting('app.current_company_id', true) IS NULL
        OR company_id = current_setting('app.current_company_id', true)::uuid
      );
  END IF;
END $$;
