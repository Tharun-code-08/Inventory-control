-- Tier 2 Phase 4 — domain features:
--   * Stock costing engine (CostLayer + StockSummary.avgCost + Shop.costingMethod).
--   * Tax + discount + currency on SO/PO/Invoice/Payment.
--   * Multi-currency tables (Currency, FxRate).
--   * Customer + supplier returns and credit notes.
--   * SO partial fulfillment (shippedQty + fulfillment_status).

CREATE TYPE "CostingMethod" AS ENUM ('AVERAGE', 'FIFO');
CREATE TYPE "FulfillmentStatus" AS ENUM ('NONE', 'PARTIAL', 'FULL');
CREATE TYPE "ReturnStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED');
CREATE TYPE "CreditNoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'APPLIED', 'VOID');

ALTER TABLE "shops"
  ADD COLUMN "costing_method" "CostingMethod" NOT NULL DEFAULT 'AVERAGE',
  ADD COLUMN "functional_currency" TEXT NOT NULL DEFAULT 'USD';

ALTER TABLE "stock_summary"
  ADD COLUMN "avg_cost" DECIMAL(14, 4) NOT NULL DEFAULT 0;

-- Tax + discount + currency on the order/invoice graphs.
ALTER TABLE "sales_order_header"
  ADD COLUMN "fulfillment_status" "FulfillmentStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN "fx_rate_used" DECIMAL(18, 8),
  ADD COLUMN "discount_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "tax_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0;
CREATE INDEX "sales_order_header_shop_id_fulfillment_status_idx"
  ON "sales_order_header" ("shop_id", "fulfillment_status");

ALTER TABLE "sales_order_items"
  ADD COLUMN "shipped_qty" DECIMAL(12, 3) NOT NULL DEFAULT 0,
  ADD COLUMN "discount_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "tax_rate" DECIMAL(7, 4) NOT NULL DEFAULT 0,
  ADD COLUMN "tax_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE "purchase_order_header"
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN "fx_rate_used" DECIMAL(18, 8),
  ADD COLUMN "discount_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "tax_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE "purchase_order_items"
  ADD COLUMN "discount_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "tax_rate" DECIMAL(7, 4) NOT NULL DEFAULT 0,
  ADD COLUMN "tax_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE "invoice_header"
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN "fx_rate_used" DECIMAL(18, 8),
  ADD COLUMN "discount_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "tax_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE "payment_receipts"
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN "fx_rate_used" DECIMAL(18, 8);

CREATE TABLE "cost_layers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "shop_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "gr_id" UUID,
  "ledger_id" UUID,
  "qty_remaining" DECIMAL(12, 3) NOT NULL,
  "qty_original" DECIMAL(12, 3) NOT NULL,
  "unit_cost" DECIMAL(14, 4) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cost_layers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cost_layers_shop_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id"),
  CONSTRAINT "cost_layers_product_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id")
);
CREATE INDEX "cost_layers_shop_product_created_idx"
  ON "cost_layers" ("shop_id", "product_id", "created_at");
CREATE INDEX "cost_layers_qty_remaining_idx" ON "cost_layers" ("qty_remaining");

CREATE TABLE "currencies" (
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "decimals" INTEGER NOT NULL DEFAULT 2,
  CONSTRAINT "currencies_pkey" PRIMARY KEY ("code")
);
INSERT INTO "currencies" ("code", "name", "decimals") VALUES
  ('USD', 'US Dollar', 2),
  ('EUR', 'Euro', 2),
  ('INR', 'Indian Rupee', 2),
  ('GBP', 'Pound Sterling', 2),
  ('AED', 'UAE Dirham', 2)
ON CONFLICT ("code") DO NOTHING;

CREATE TABLE "fx_rates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "base" TEXT NOT NULL,
  "quote" TEXT NOT NULL,
  "rate" DECIMAL(18, 8) NOT NULL,
  "as_of" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "fx_rates_base_quote_as_of_key" ON "fx_rates" ("base", "quote", "as_of");
CREATE INDEX "fx_rates_base_quote_as_of_idx" ON "fx_rates" ("base", "quote", "as_of");

CREATE TABLE "customer_returns" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "return_number" TEXT NOT NULL,
  "return_date" DATE NOT NULL,
  "shop_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "invoice_id" UUID,
  "sales_order_id" UUID,
  "reason" TEXT,
  "remarks" TEXT,
  "status" "ReturnStatus" NOT NULL DEFAULT 'DRAFT',
  "total_value" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "posted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_by" UUID,
  CONSTRAINT "customer_returns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_returns_shop_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id"),
  CONSTRAINT "customer_returns_customer_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id"),
  CONSTRAINT "customer_returns_invoice_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice_header"("id"),
  CONSTRAINT "customer_returns_so_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_order_header"("id")
);
CREATE UNIQUE INDEX "customer_returns_return_number_key" ON "customer_returns" ("return_number");
CREATE INDEX "customer_returns_shop_date_idx" ON "customer_returns" ("shop_id", "return_date");
CREATE INDEX "customer_returns_customer_idx" ON "customer_returns" ("customer_id");
CREATE INDEX "customer_returns_invoice_idx" ON "customer_returns" ("invoice_id");

CREATE TABLE "customer_return_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "return_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "quantity" DECIMAL(12, 3) NOT NULL,
  "uom" TEXT NOT NULL,
  "unit_price" DECIMAL(12, 2) NOT NULL,
  "line_value" DECIMAL(14, 2) NOT NULL,
  CONSTRAINT "customer_return_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_return_items_return_fkey" FOREIGN KEY ("return_id") REFERENCES "customer_returns"("id") ON DELETE CASCADE,
  CONSTRAINT "customer_return_items_product_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id")
);
CREATE INDEX "customer_return_items_return_idx" ON "customer_return_items" ("return_id");

CREATE TABLE "supplier_returns" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "return_number" TEXT NOT NULL,
  "return_date" DATE NOT NULL,
  "shop_id" UUID NOT NULL,
  "supplier_name" TEXT NOT NULL,
  "purchase_order_id" UUID,
  "reason" TEXT,
  "remarks" TEXT,
  "status" "ReturnStatus" NOT NULL DEFAULT 'DRAFT',
  "total_value" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "posted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_by" UUID,
  CONSTRAINT "supplier_returns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_returns_shop_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id"),
  CONSTRAINT "supplier_returns_po_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_order_header"("id")
);
CREATE UNIQUE INDEX "supplier_returns_return_number_key" ON "supplier_returns" ("return_number");
CREATE INDEX "supplier_returns_shop_date_idx" ON "supplier_returns" ("shop_id", "return_date");
CREATE INDEX "supplier_returns_po_idx" ON "supplier_returns" ("purchase_order_id");

CREATE TABLE "supplier_return_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "return_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "quantity" DECIMAL(12, 3) NOT NULL,
  "uom" TEXT NOT NULL,
  "unit_cost" DECIMAL(12, 2) NOT NULL,
  "line_value" DECIMAL(14, 2) NOT NULL,
  CONSTRAINT "supplier_return_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_return_items_return_fkey" FOREIGN KEY ("return_id") REFERENCES "supplier_returns"("id") ON DELETE CASCADE,
  CONSTRAINT "supplier_return_items_product_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id")
);
CREATE INDEX "supplier_return_items_return_idx" ON "supplier_return_items" ("return_id");

CREATE TABLE "credit_notes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "credit_number" TEXT NOT NULL,
  "credit_date" DATE NOT NULL,
  "shop_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "invoice_id" UUID,
  "return_id" UUID,
  "status" "CreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
  "amount" DECIMAL(14, 2) NOT NULL,
  "applied_amount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  "remarks" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID,
  "updated_by" UUID,
  CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "credit_notes_shop_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id"),
  CONSTRAINT "credit_notes_customer_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id"),
  CONSTRAINT "credit_notes_invoice_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoice_header"("id"),
  CONSTRAINT "credit_notes_return_fkey" FOREIGN KEY ("return_id") REFERENCES "customer_returns"("id")
);
CREATE UNIQUE INDEX "credit_notes_credit_number_key" ON "credit_notes" ("credit_number");
CREATE UNIQUE INDEX "credit_notes_return_id_key" ON "credit_notes" ("return_id");
CREATE INDEX "credit_notes_shop_date_idx" ON "credit_notes" ("shop_id", "credit_date");
CREATE INDEX "credit_notes_customer_idx" ON "credit_notes" ("customer_id");
