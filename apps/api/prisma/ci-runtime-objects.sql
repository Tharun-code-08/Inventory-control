-- CI runtime DB objects ------------------------------------------------------
-- `prisma db push` materializes the Prisma schema (tables, enums, indexes) but
-- NOT the hand-written PL/pgSQL triggers that live only in migration SQL. The
-- stock-ledger triggers are business-critical (running balance, stock summary
-- upsert, oversell guard), so the integration tests need them. This file holds
-- the CURRENT (latest) definitions and is applied right after `db push`.
--
-- All statements are idempotent (CREATE OR REPLACE / DROP TRIGGER IF EXISTS),
-- so it is safe to run repeatedly.

-- Oversell guard + per-(shop,product) serialization (latest: phase1_data_integrity)
CREATE OR REPLACE FUNCTION trg_stock_ledger_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  prev numeric(12,3);
  projected numeric(12,3);
BEGIN
  -- Serialize concurrent ledger inserts on the same (shop, product) for the
  -- duration of the calling transaction so balance checks cannot race.
  PERFORM pg_advisory_xact_lock(hashtext(NEW.shop_id::text || ':' || NEW.product_id::text));

  IF NEW.out_qty > 0 THEN
    SELECT balance_qty INTO prev
    FROM stock_ledger
    WHERE shop_id = NEW.shop_id AND product_id = NEW.product_id
    ORDER BY transaction_date DESC, created_at DESC, id DESC
    LIMIT 1;

    projected := COALESCE(prev, 0) + COALESCE(NEW.in_qty, 0) - COALESCE(NEW.out_qty, 0);
    IF projected < 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK_DB' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_negative_check ON stock_ledger;
CREATE TRIGGER trg_stock_negative_check
BEFORE INSERT ON stock_ledger
FOR EACH ROW
EXECUTE PROCEDURE trg_stock_ledger_before_insert();

-- Running balance + stock_summary upsert (latest: stock_trigger_coalesce_new_qty)
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

  new_bal :=
    COALESCE(prev, 0)
    + COALESCE(NEW.in_qty, 0)
    - COALESCE(NEW.out_qty, 0);

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

DROP TRIGGER IF EXISTS trg_stock_ledger_after_insert ON stock_ledger;
CREATE TRIGGER trg_stock_ledger_after_insert
AFTER INSERT ON stock_ledger
FOR EACH ROW
EXECUTE PROCEDURE trg_stock_ledger_after_insert();
