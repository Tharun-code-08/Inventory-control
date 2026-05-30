-- Idempotency cache used by PO/payment create retries.
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "scope" TEXT,
  "result" JSONB NOT NULL,
  "user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6),
  CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "idempotency_keys_key_key" ON "idempotency_keys"("key");
CREATE INDEX IF NOT EXISTS "idempotency_keys_scope_idx" ON "idempotency_keys"("scope");
CREATE INDEX IF NOT EXISTS "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- RFQ-linked PO lines and line tax columns (safe if already present).
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "rfq_item_id" UUID;
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "line_description" TEXT;
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "line_category" TEXT;
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "tax_rate" DECIMAL(7,4) NOT NULL DEFAULT 0;
ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "purchase_order_items_rfq_item_id_idx" ON "purchase_order_items"("rfq_item_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchase_order_items_rfq_item_id_fkey'
  ) THEN
    ALTER TABLE "purchase_order_items"
      ADD CONSTRAINT "purchase_order_items_rfq_item_id_fkey"
      FOREIGN KEY ("rfq_item_id") REFERENCES "rfq_items"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
