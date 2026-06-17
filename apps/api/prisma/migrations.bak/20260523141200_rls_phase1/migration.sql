-- Phase 1 RLS: enable policies that become effective when the session sets
-- app.current_company_id. If the setting is NULL/absent, policies allow
-- access (maintains current behavior). Setting the variable enforces company
-- scoping.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper policy fragment: allow when session company matches row company; allow
-- all when session variable is not set.

-- Companies (tenant root)
DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL THEN
    ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_companies_company ON companies;
    CREATE POLICY rls_companies_company ON companies
      USING (
        current_setting('app.current_company_id', true) IS NULL
        OR id = current_setting('app.current_company_id', true)::uuid
      );
  END IF;
END $$;

-- Shops (company scoped)
DO $$
BEGIN
  IF to_regclass('public.shops') IS NOT NULL
     AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'company_id'
    ) THEN
    ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_shops_company ON shops;
    CREATE POLICY rls_shops_company ON shops
      USING (
        current_setting('app.current_company_id', true) IS NULL
        OR company_id = current_setting('app.current_company_id', true)::uuid
      );
  END IF;
END $$;

-- Storage locations (shop -> company)
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
          WHERE s.id = shop_id
            AND s.company_id = current_setting('app.current_company_id', true)::uuid
        )
      );
  END IF;
END $$;

-- Suppliers (company scoped)
DO $$
BEGIN
  IF to_regclass('public.suppliers') IS NOT NULL
     AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'company_id'
    ) THEN
    ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_suppliers_company ON suppliers;
    CREATE POLICY rls_suppliers_company ON suppliers
      USING (
        current_setting('app.current_company_id', true) IS NULL
        OR company_id = current_setting('app.current_company_id', true)::uuid
      );
  END IF;
END $$;

-- Users (shop -> company)
DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL
     AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'company_id'
    ) THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_users_company ON users;
    CREATE POLICY rls_users_company ON users
      USING (
        current_setting('app.current_company_id', true) IS NULL
        OR EXISTS (
          SELECT 1 FROM shops s
          WHERE s.id = users.shop_id
            AND s.company_id = current_setting('app.current_company_id', true)::uuid
        )
      );
  END IF;
END $$;

-- Customers (shop -> company)
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
      );
  END IF;
END $$;

-- Goods receipts
DO $$
BEGIN
  IF to_regclass('public.goods_receipt_header') IS NOT NULL
     AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'company_id'
    ) THEN
    ALTER TABLE goods_receipt_header ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_gr_company ON goods_receipt_header;
    CREATE POLICY rls_gr_company ON goods_receipt_header
      USING (
        current_setting('app.current_company_id', true) IS NULL
        OR EXISTS (
          SELECT 1 FROM shops s
          WHERE s.id = goods_receipt_header.shop_id
            AND s.company_id = current_setting('app.current_company_id', true)::uuid
        )
      );
  END IF;
END $$;

-- Goods issues
DO $$
BEGIN
  IF to_regclass('public.goods_issue_header') IS NOT NULL
     AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'company_id'
    ) THEN
    ALTER TABLE goods_issue_header ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_gi_company ON goods_issue_header;
    CREATE POLICY rls_gi_company ON goods_issue_header
      USING (
        current_setting('app.current_company_id', true) IS NULL
        OR EXISTS (
          SELECT 1 FROM shops s
          WHERE s.id = goods_issue_header.shop_id
            AND s.company_id = current_setting('app.current_company_id', true)::uuid
        )
      );
  END IF;
END $$;

-- Purchase orders
DO $$
BEGIN
  IF to_regclass('public.purchase_order_header') IS NOT NULL
     AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'company_id'
    ) THEN
    ALTER TABLE purchase_order_header ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_po_company ON purchase_order_header;
    CREATE POLICY rls_po_company ON purchase_order_header
      USING (
        current_setting('app.current_company_id', true) IS NULL
        OR EXISTS (
          SELECT 1 FROM shops s
          WHERE s.id = purchase_order_header.shop_id
            AND s.company_id = current_setting('app.current_company_id', true)::uuid
        )
      );
  END IF;
END $$;

-- Sales orders
DO $$
BEGIN
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
      );
  END IF;
END $$;

-- Invoices
DO $$
BEGIN
  IF to_regclass('public.invoice_header') IS NOT NULL
     AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'shops' AND column_name = 'company_id'
    ) THEN
    ALTER TABLE invoice_header ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS rls_inv_company ON invoice_header;
    CREATE POLICY rls_inv_company ON invoice_header
      USING (
        current_setting('app.current_company_id', true) IS NULL
        OR EXISTS (
          SELECT 1 FROM shops s
          WHERE s.id = invoice_header.shop_id
            AND s.company_id = current_setting('app.current_company_id', true)::uuid
        )
      );
  END IF;
END $$;
