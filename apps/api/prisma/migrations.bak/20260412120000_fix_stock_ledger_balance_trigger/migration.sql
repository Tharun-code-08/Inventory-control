-- First ledger row per product: SELECT INTO leaves prev NULL when no prior row;
-- NULL + in_qty => NULL and balance_qty was set to NULL by the AFTER trigger.
CREATE OR REPLACE FUNCTION trg_stock_ledger_after_insert()
RETURNS TRIGGER AS $$
DECLARE
  prev numeric(12,3);
  new_bal numeric(12,3);
BEGIN
  SELECT COALESCE(balance_qty, 0) INTO prev
  FROM stock_ledger
  WHERE shop_id = NEW.shop_id AND product_id = NEW.product_id AND id <> NEW.id
  ORDER BY transaction_date DESC, created_at DESC, id DESC
  LIMIT 1;

  new_bal := COALESCE(prev, 0) + NEW.in_qty - NEW.out_qty;

  UPDATE stock_ledger SET balance_qty = new_bal WHERE id = NEW.id;

  INSERT INTO stock_summary (id, shop_id, product_id, current_stock, last_movement_at, created_at, updated_at)
  VALUES (gen_random_uuid(), NEW.shop_id, NEW.product_id, new_bal, now(), now(), now())
  ON CONFLICT (shop_id, product_id)
  DO UPDATE SET
    current_stock = EXCLUDED.current_stock,
    last_movement_at = EXCLUDED.last_movement_at,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
