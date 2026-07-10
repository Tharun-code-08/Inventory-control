-- Backfill inventory_lots from existing stock (ledger-first, summary fallback)
-- Idempotent: skips if lot already exists for (shop, product, lot_number)

WITH balances AS (
  -- Get balance per (shop, product) from ledger (preferred) or summary fallback
  SELECT
    COALESCE(l.shop_id, s.shop_id) AS shop_id,
    COALESCE(l.product_id, s.product_id) AS product_id,
    COALESCE(l.net, s.current_stock, 0) AS on_hand
  FROM (
    -- Ledger aggregate: SUM(in_qty - out_qty)
    SELECT shop_id, product_id, SUM(in_qty - out_qty) AS net
    FROM stock_ledger
    GROUP BY shop_id, product_id
  ) l
  FULL OUTER JOIN stock_summary s
    ON s.shop_id = l.shop_id AND s.product_id = l.product_id
)
INSERT INTO inventory_lots
  (id, company_id, shop_id, product_id, lot_number, expiry_date,
   qty_received, qty_on_hand, unit_cost, status, storage_location_id, created_at, updated_at)
SELECT
  gen_random_uuid(),
  sh.company_id,
  b.shop_id,
  b.product_id,
  COALESCE(pp.batch_number, 'LEGACY'),
  pp.expiry_date,
  b.on_hand,
  b.on_hand,
  COALESCE(ss.avg_cost, 0),
  'ACTIVE'::"InventoryLotStatus",
  pp.storage_location_id,
  NOW(),
  NOW()
FROM balances b
JOIN shops sh ON sh.id = b.shop_id
LEFT JOIN product_plants pp ON pp.product_id = b.product_id AND pp.shop_id = b.shop_id
LEFT JOIN stock_summary ss ON ss.shop_id = b.shop_id AND ss.product_id = b.product_id
WHERE b.on_hand > 0
  AND sh.company_id IS NOT NULL
  -- Idempotent: skip if lot already exists
  AND NOT EXISTS (
    SELECT 1 FROM inventory_lots il
    WHERE il.shop_id = b.shop_id
      AND il.product_id = b.product_id
      AND il.lot_number = COALESCE(pp.batch_number, 'LEGACY')
  );
