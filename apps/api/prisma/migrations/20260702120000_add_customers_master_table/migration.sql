-- Customers master table was referenced by later migrations but never created on fresh deploys.

CREATE TABLE IF NOT EXISTS "customers" (
  "id" UUID NOT NULL,
  "customer_code" TEXT NOT NULL,
  "customer_name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "tax_id" TEXT,
  "pan" TEXT,
  "street" TEXT,
  "city" TEXT,
  "state" TEXT,
  "postal_code" TEXT,
  "country" TEXT,
  "shop_id" UUID NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_by" UUID,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF to_regclass('public.shops') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'customers_shop_id_fkey'
     ) THEN
    ALTER TABLE "customers"
      ADD CONSTRAINT "customers_shop_id_fkey"
      FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "customers_shop_id_customer_code_key"
  ON "customers"("shop_id", "customer_code");

CREATE INDEX IF NOT EXISTS "customers_shop_id_customer_name_idx"
  ON "customers"("shop_id", "customer_name");

-- Ensure PAN exists when table predated this migration.
DO $$
BEGIN
  IF to_regclass('public.customers') IS NOT NULL THEN
    ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "pan" TEXT;
  END IF;
END $$;

-- RLS: allow INSERT when session company is unset (tests) or shop belongs to tenant.
DO $$
BEGIN
  IF to_regclass('public.customers') IS NOT NULL
     AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'company_id'
    ) THEN
    ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_customers_company ON customers;
    CREATE POLICY rls_customers_company ON customers
      USING (
        current_setting('app.current_company_id', true) IS NULL
        OR EXISTS (
          SELECT 1 FROM shops s
          WHERE s.id = customers.shop_id
            AND s.company_id = current_setting('app.current_company_id', true)::uuid
        )
      )
      WITH CHECK (
        current_setting('app.current_company_id', true) IS NULL
        OR EXISTS (
          SELECT 1 FROM shops s
          WHERE s.id = customers.shop_id
            AND s.company_id = current_setting('app.current_company_id', true)::uuid
        )
      );
  END IF;
END $$;
