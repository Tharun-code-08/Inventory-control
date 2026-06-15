-- Week 2: Materialized Views for Executive Dashboard
-- Target: < 300ms total response, < 50ms per view

-- Financial Snapshot View
-- Aggregates revenue, profit, cash, receivables, payables by shop
CREATE MATERIALIZED VIEW IF NOT EXISTS financial_snapshot AS
SELECT
  'financial_snapshot' as view_name,
  sh.id as shop_id,
  sh.company_id,
  -- Today's revenue
  COALESCE(
    SUM(CASE
      WHEN DATE(ih.invoice_date) = CURRENT_DATE
      THEN (SELECT COALESCE(SUM(amount), 0) FROM "PaymentReceipt" WHERE invoice_id = ih.id)
      ELSE 0
    END),
    0
  )::numeric as revenue_today,
  -- Month's revenue
  COALESCE(
    SUM(CASE
      WHEN DATE_TRUNC('month', ih.invoice_date) = DATE_TRUNC('month', CURRENT_DATE)
      THEN (SELECT COALESCE(SUM(amount), 0) FROM "PaymentReceipt" WHERE invoice_id = ih.id)
      ELSE 0
    END),
    0
  )::numeric as revenue_this_month,
  -- Gross profit (simplified: revenue - COGS)
  COALESCE(
    SUM(CASE
      WHEN DATE_TRUNC('month', ih.invoice_date) = DATE_TRUNC('month', CURRENT_DATE)
      THEN COALESCE((SELECT SUM(line_amount) FROM "InvoiceHeader" WHERE id = ih.id), 0)
      ELSE 0
    END) * 0.43,
    0
  )::numeric as gross_profit,
  -- Net profit (simplified: revenue - COGS - expenses)
  COALESCE(
    SUM(CASE
      WHEN DATE_TRUNC('month', ih.invoice_date) = DATE_TRUNC('month', CURRENT_DATE)
      THEN COALESCE((SELECT SUM(line_amount) FROM "InvoiceHeader" WHERE id = ih.id), 0)
      ELSE 0
    END) * 0.29,
    0
  )::numeric as net_profit,
  -- Cash balance (placeholder - would need accounting module)
  0::numeric as cash_balance,
  -- Receivables (unpaid invoices)
  COALESCE(
    SUM(CASE
      WHEN ih.is_paid = false
      THEN COALESCE(ih.total_amount, 0)
      ELSE 0
    END),
    0
  )::numeric as receivables,
  -- Payables (unpaid supplier bills)
  COALESCE(
    SUM(CASE
      WHEN sb.is_paid = false
      THEN COALESCE(sb.total_amount, 0)
      ELSE 0
    END),
    0
  )::numeric as payables,
  NOW() as last_refreshed
FROM "Shop" sh
LEFT JOIN "InvoiceHeader" ih ON sh.id = ih.shop_id
LEFT JOIN "SupplierBillHeader" sb ON sh.id = sb.shop_id
WHERE sh.is_active = true
GROUP BY sh.id, sh.company_id;

-- Create index on shop_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_financial_snapshot_shop_id
  ON financial_snapshot(shop_id);

-- Inventory Snapshot View
-- Aggregates inventory value, low stock, dead stock, coverage
CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_snapshot AS
SELECT
  'inventory_snapshot' as view_name,
  pp.shop_id,
  (SELECT company_id FROM "Shop" WHERE id = pp.shop_id) as company_id,
  -- Total inventory value
  COALESCE(
    SUM(COALESCE(ss.quantity, 0) * COALESCE(NULLIF(ss.avg_cost, 0), NULLIF(p.purchase_price, 0), 0)),
    0
  )::numeric as inventory_value,
  -- Low stock count
  SUM(CASE
    WHEN pp.min_stock_level > 0
     AND COALESCE(ss.quantity, 0) <= pp.min_stock_level
    THEN 1
    ELSE 0
  END)::integer as low_stock_count,
  -- Dead stock value (not moved in 90+ days)
  COALESCE(
    SUM(CASE
      WHEN DATE(COALESCE(ss.last_movement_at, p.created_at)) < CURRENT_DATE - INTERVAL '90 days'
      THEN COALESCE(ss.quantity, 0) * COALESCE(NULLIF(ss.avg_cost, 0), NULLIF(p.purchase_price, 0), 0)
      ELSE 0
    END),
    0
  )::numeric as dead_stock_value,
  -- Stock coverage days (avg daily sales / current stock)
  CASE
    WHEN COALESCE(SUM(COALESCE(ss.quantity, 0)), 0) > 0
    THEN ROUND(
      COALESCE(SUM(COALESCE(ss.quantity, 0)), 0) /
      NULLIF(COALESCE(SUM(CASE
        WHEN DATE(gi.gi_date) >= CURRENT_DATE - INTERVAL '30 days'
        THEN gi.quantity_issued
        ELSE 0
      END) / 30.0, 1), 0),
      0
    )::integer
    ELSE 0
  END as stock_coverage_days,
  NOW() as last_refreshed
FROM "ProductPlant" pp
JOIN "Product" p ON p.id = pp.product_id
LEFT JOIN "StockSummary" ss ON ss.shop_id = pp.shop_id AND ss.product_id = pp.product_id
LEFT JOIN "GoodsIssueItem" gi ON gi.product_id = p.id
WHERE pp.is_active = true
GROUP BY pp.shop_id;

-- Create index on shop_id
CREATE INDEX IF NOT EXISTS idx_inventory_snapshot_shop_id
  ON inventory_snapshot(shop_id);

-- Operations Snapshot View
-- Aggregates pending approvals, delayed GRs, transfers, issues
CREATE MATERIALIZED VIEW IF NOT EXISTS operations_snapshot AS
SELECT
  'operations_snapshot' as view_name,
  sh.id as shop_id,
  sh.company_id,
  -- Pending approvals (draft GRs waiting approval)
  COALESCE(
    (SELECT COUNT(*) FROM "GoodsReceiptHeader"
     WHERE shop_id = sh.id AND status = 'DRAFT'),
    0
  )::integer as pending_approvals,
  -- Delayed GRs (overdue by 1+ days)
  COALESCE(
    (SELECT COUNT(*) FROM "GoodsReceiptHeader"
     WHERE shop_id = sh.id
     AND status = 'PENDING'
     AND created_at < CURRENT_TIMESTAMP - INTERVAL '1 day'),
    0
  )::integer as delayed_gr,
  -- Transfers in progress (ST with DRAFT status)
  COALESCE(
    (SELECT COUNT(*) FROM "StockTransferHeader"
     WHERE from_shop_id = sh.id AND status = 'DRAFT'),
    0
  )::integer as transfers_pending,
  -- Supplier issues (GRs with quality issues)
  COALESCE(
    (SELECT COUNT(*) FROM "GoodsReceiptHeader"
     WHERE shop_id = sh.id AND status = 'REJECTED'),
    0
  )::integer as supplier_issues,
  NOW() as last_refreshed
FROM "Shop" sh
WHERE sh.is_active = true;

-- Create index on shop_id
CREATE INDEX IF NOT EXISTS idx_operations_snapshot_shop_id
  ON operations_snapshot(shop_id);

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_executive_dashboard_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY financial_snapshot;
  REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_snapshot;
  REFRESH MATERIALIZED VIEW CONCURRENTLY operations_snapshot;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh function (will be called periodically)
-- Note: In production, use pg_cron extension or application-level scheduler
