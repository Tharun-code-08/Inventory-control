-- Phase 1 (data integrity): dedicated idempotency storage and tightened stock-posting locks.

-- 1) Add a native unique idempotency_key column to stock_ledger, replacing the
--    unsafe `findFirst({ remarks: { contains: key } })` pattern previously used in
--    StockService.postMovementOnce. The unique constraint lets us insert with the
--    key and detect duplicates via Prisma P2002 (unique violation).
ALTER TABLE "stock_ledger" ADD COLUMN "idempotency_key" TEXT;
CREATE UNIQUE INDEX "stock_ledger_idempotency_key_key" ON "stock_ledger" ("idempotency_key");

-- 2) Endpoint-level idempotency cache. Stores the result of mutating endpoints
--    keyed by a client-supplied idempotency key so retries return the same
--    response without re-running side-effects.
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "scope" TEXT,
    "result" JSONB NOT NULL,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "idempotency_keys_key_key" ON "idempotency_keys" ("key");
CREATE INDEX "idempotency_keys_scope_idx" ON "idempotency_keys" ("scope");
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys" ("expires_at");

-- 3) Re-create the stock-ledger BEFORE INSERT trigger so that concurrent posts
--    on the same (shop, product) inside any transaction are serialized via a
--    transaction-scoped advisory lock. Without this, two concurrent INSERTs at
--    READ COMMITTED can both observe the same prior balance and both pass the
--    negative-stock check, allowing oversell.
CREATE OR REPLACE FUNCTION trg_stock_ledger_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  prev numeric(12,3);
  projected numeric(12,3);
BEGIN
  -- Serialize concurrent ledger inserts on the same (shop, product) for the
  -- duration of the calling transaction. Both BEFORE and AFTER triggers run
  -- inside the lock window so balance computation and summary upsert are safe.
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
