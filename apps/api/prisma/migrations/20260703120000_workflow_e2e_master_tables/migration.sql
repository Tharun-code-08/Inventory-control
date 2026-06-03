-- Master tables referenced by later migrations but missing on fresh CI deploys.

CREATE TABLE IF NOT EXISTS "storage_locations" (
  "id" UUID NOT NULL,
  "shop_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_by" UUID,
  CONSTRAINT "storage_locations_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF to_regclass('public.shops') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'storage_locations_shop_id_fkey'
     ) THEN
    ALTER TABLE "storage_locations"
      ADD CONSTRAINT "storage_locations_shop_id_fkey"
      FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "storage_locations_shop_id_code_key"
  ON "storage_locations"("shop_id", "code");

CREATE INDEX IF NOT EXISTS "storage_locations_shop_id_code_idx"
  ON "storage_locations"("shop_id", "code");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SalesOrderStatus') THEN
    CREATE TYPE "SalesOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'FULFILLED', 'CLOSED', 'CANCELLED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "sales_order_header" (
  "id" UUID NOT NULL,
  "so_number" TEXT NOT NULL,
  "order_date" DATE NOT NULL,
  "expected_date" DATE,
  "customer_id" UUID NOT NULL,
  "shop_id" UUID NOT NULL,
  "status" "SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "fulfillment_status" "FulfillmentStatus" NOT NULL DEFAULT 'NONE',
  "remarks" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "fx_rate_used" DECIMAL(18, 8),
  "discount_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "tax_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "total_value" DECIMAL(14, 2),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_by" UUID,
  CONSTRAINT "sales_order_header_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sales_order_items" (
  "id" UUID NOT NULL,
  "so_header_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "quantity" DECIMAL(12, 3) NOT NULL,
  "shipped_qty" DECIMAL(12, 3) NOT NULL DEFAULT 0,
  "uom" TEXT NOT NULL,
  "unit_price" DECIMAL(12, 2) NOT NULL,
  "discount_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "tax_rate" DECIMAL(7, 4) NOT NULL DEFAULT 0,
  "tax_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "line_value" DECIMAL(14, 2) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_by" UUID,
  CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF to_regclass('public.customers') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_order_header_customer_id_fkey') THEN
    ALTER TABLE "sales_order_header"
      ADD CONSTRAINT "sales_order_header_customer_id_fkey"
      FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF to_regclass('public.shops') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_order_header_shop_id_fkey') THEN
    ALTER TABLE "sales_order_header"
      ADD CONSTRAINT "sales_order_header_shop_id_fkey"
      FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF to_regclass('public.sales_order_header') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_order_items_so_header_id_fkey') THEN
    ALTER TABLE "sales_order_items"
      ADD CONSTRAINT "sales_order_items_so_header_id_fkey"
      FOREIGN KEY ("so_header_id") REFERENCES "sales_order_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF to_regclass('public.products') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sales_order_items_product_id_fkey') THEN
    ALTER TABLE "sales_order_items"
      ADD CONSTRAINT "sales_order_items_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "sales_order_header_so_number_key"
  ON "sales_order_header"("so_number");

CREATE INDEX IF NOT EXISTS "sales_order_header_shop_id_order_date_idx"
  ON "sales_order_header"("shop_id", "order_date");

CREATE INDEX IF NOT EXISTS "sales_order_header_customer_id_idx"
  ON "sales_order_header"("customer_id");

CREATE INDEX IF NOT EXISTS "sales_order_header_shop_id_fulfillment_status_idx"
  ON "sales_order_header"("shop_id", "fulfillment_status");

CREATE INDEX IF NOT EXISTS "sales_order_items_so_header_id_idx"
  ON "sales_order_items"("so_header_id");

-- Branding columns when enum exists (later migrations may also add these).
DO $$
BEGIN
  IF to_regclass('public.sales_order_header') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BrandingMode') THEN
    ALTER TABLE "sales_order_header"
      ADD COLUMN IF NOT EXISTS "branding_mode" "BrandingMode" NOT NULL DEFAULT 'SNAPSHOT',
      ADD COLUMN IF NOT EXISTS "branding_snapshot" JSONB,
      ADD COLUMN IF NOT EXISTS "branding_version" INTEGER,
      ADD COLUMN IF NOT EXISTS "template_version" INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;

-- RLS for storage locations and sales orders.
DO $$
BEGIN
  IF to_regclass('public.storage_locations') IS NOT NULL
     AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'company_id'
    ) THEN
    ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_storage_locations_company ON storage_locations;
    CREATE POLICY rls_storage_locations_company ON storage_locations
      USING (
        current_setting('app.current_company_id', true) IS NULL
        OR EXISTS (
          SELECT 1 FROM shops s
          WHERE s.id = storage_locations.shop_id
            AND s.company_id = current_setting('app.current_company_id', true)::uuid
        )
      )
      WITH CHECK (
        current_setting('app.current_company_id', true) IS NULL
        OR EXISTS (
          SELECT 1 FROM shops s
          WHERE s.id = storage_locations.shop_id
            AND s.company_id = current_setting('app.current_company_id', true)::uuid
        )
      );
  END IF;

  IF to_regclass('public.sales_order_header') IS NOT NULL
     AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'company_id'
    ) THEN
    ALTER TABLE sales_order_header ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_so_company ON sales_order_header;
    CREATE POLICY rls_so_company ON sales_order_header
      USING (
        current_setting('app.current_company_id', true) IS NULL
        OR EXISTS (
          SELECT 1 FROM shops s
          WHERE s.id = sales_order_header.shop_id
            AND s.company_id = current_setting('app.current_company_id', true)::uuid
        )
      )
      WITH CHECK (
        current_setting('app.current_company_id', true) IS NULL
        OR EXISTS (
          SELECT 1 FROM shops s
          WHERE s.id = sales_order_header.shop_id
            AND s.company_id = current_setting('app.current_company_id', true)::uuid
        )
      );
  END IF;
END $$;
