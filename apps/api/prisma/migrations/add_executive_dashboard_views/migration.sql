-- Week 2: Materialized Views for Executive Dashboard
-- Target: < 300ms total response, < 50ms per view
--
-- NOTE: Defined against the real mapped table/column names (snake_case) so the
-- migration applies cleanly on a fresh database. Each view yields exactly one
-- row per active shop, so shop_id is UNIQUE — enabling REFRESH ... CONCURRENTLY.

-- Financial Snapshot View ----------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS financial_snapshot AS
SELECT
  'financial_snapshot' AS view_name,
  sh.id AS shop_id,
  sh.company_id,
  -- Today's collections
  COALESCE((
    SELECT SUM(pr.amount)
    FROM payment_receipts pr
    WHERE pr.shop_id = sh.id AND pr.receipt_date = CURRENT_DATE
  ), 0)::numeric AS revenue_today,
  -- This month's collections
  COALESCE((
    SELECT SUM(pr.amount)
    FROM payment_receipts pr
    WHERE pr.shop_id = sh.id
      AND DATE_TRUNC('month', pr.receipt_date) = DATE_TRUNC('month', CURRENT_DATE)
  ), 0)::numeric AS revenue_this_month,
  -- Gross / net profit (simplified heuristic until an accounting module lands)
  (COALESCE((
    SELECT SUM(pr.amount)
    FROM payment_receipts pr
    WHERE pr.shop_id = sh.id
      AND DATE_TRUNC('month', pr.receipt_date) = DATE_TRUNC('month', CURRENT_DATE)
  ), 0) * 0.43)::numeric AS gross_profit,
  (COALESCE((
    SELECT SUM(pr.amount)
    FROM payment_receipts pr
    WHERE pr.shop_id = sh.id
      AND DATE_TRUNC('month', pr.receipt_date) = DATE_TRUNC('month', CURRENT_DATE)
  ), 0) * 0.29)::numeric AS net_profit,
  -- Cash balance placeholder (needs accounting module)
  0::numeric AS cash_balance,
  -- Receivables: open invoice balances
  COALESCE((
    SELECT SUM(ih.total_value - ih.paid_value)
    FROM invoice_header ih
    WHERE ih.shop_id = sh.id AND ih.status::text NOT IN ('PAID', 'VOID')
  ), 0)::numeric AS receivables,
  -- Payables: open supplier bill balances
  COALESCE((
    SELECT SUM(sb.total_value - sb.paid_value)
    FROM supplier_bill_header sb
    WHERE sb.shop_id = sh.id AND sb.status::text NOT IN ('PAID', 'VOID')
  ), 0)::numeric AS payables,
  NOW() AS last_refreshed
FROM shops sh
WHERE sh.is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_snapshot_shop_id
  ON financial_snapshot(shop_id);

-- Inventory Snapshot View ----------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_snapshot AS
SELECT
  'inventory_snapshot' AS view_name,
  sh.id AS shop_id,
  sh.company_id,
  -- Total inventory value at average cost (fallback to purchase price)
  COALESCE((
    SELECT SUM(ss.current_stock * COALESCE(NULLIF(ss.avg_cost, 0), p.purchase_price, 0))
    FROM stock_summary ss
    JOIN products p ON p.id = ss.product_id
    WHERE ss.shop_id = sh.id
  ), 0)::numeric AS inventory_value,
  -- Items at or below their minimum stock level
  COALESCE((
    SELECT COUNT(*)
    FROM product_plants pp
    JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = pp.product_id
    WHERE pp.shop_id = sh.id
      AND pp.is_active = true
      AND pp.min_stock_level > 0
      AND ss.current_stock <= pp.min_stock_level
  ), 0)::integer AS low_stock_count,
  -- Value of stock not moved in 90+ days
  COALESCE((
    SELECT SUM(ss.current_stock * COALESCE(NULLIF(ss.avg_cost, 0), p.purchase_price, 0))
    FROM stock_summary ss
    JOIN products p ON p.id = ss.product_id
    WHERE ss.shop_id = sh.id
      AND ss.last_movement_at < CURRENT_DATE - INTERVAL '90 days'
  ), 0)::numeric AS dead_stock_value,
  -- Coverage in days (needs sales velocity; left at 0 until the metric is wired)
  0::integer AS stock_coverage_days,
  NOW() AS last_refreshed
FROM shops sh
WHERE sh.is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_snapshot_shop_id
  ON inventory_snapshot(shop_id);

-- Operations Snapshot View ---------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS operations_snapshot AS
SELECT
  'operations_snapshot' AS view_name,
  sh.id AS shop_id,
  sh.company_id,
  -- Overdue, still-open invoices
  COALESCE((
    SELECT COUNT(*)
    FROM invoice_header ih
    WHERE ih.shop_id = sh.id
      AND ih.due_date IS NOT NULL
      AND ih.due_date < CURRENT_DATE
      AND ih.status::text NOT IN ('PAID', 'VOID')
  ), 0)::integer AS overdue_payments,
  -- Items at or below minimum stock level
  COALESCE((
    SELECT COUNT(*)
    FROM product_plants pp
    JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = pp.product_id
    WHERE pp.shop_id = sh.id
      AND pp.is_active = true
      AND pp.min_stock_level > 0
      AND ss.current_stock <= pp.min_stock_level
  ), 0)::integer AS low_stock_alerts,
  -- Approvals are surfaced live via the /approvals API; kept 0 here.
  0::integer AS pending_approvals,
  NOW() AS last_refreshed
FROM shops sh
WHERE sh.is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_snapshot_shop_id
  ON operations_snapshot(shop_id);

-- Refresh helper -------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_executive_dashboard_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY financial_snapshot;
  REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_snapshot;
  REFRESH MATERIALIZED VIEW CONCURRENTLY operations_snapshot;
END;
$$ LANGUAGE plpgsql;
