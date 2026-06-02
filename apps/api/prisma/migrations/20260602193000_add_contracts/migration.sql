-- CreateTable
CREATE TABLE "contract_header" (
  "id" UUID NOT NULL,
  "contract_number" TEXT NOT NULL,
  "shop_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "rfq_id" UUID,
  "quotation_id" UUID,
  "title" TEXT NOT NULL,
  "payment_terms" TEXT,
  "start_date" DATE NOT NULL,
  "end_date" DATE,
  "notes" TEXT,
  "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "posted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "created_by" UUID,
  "updated_by" UUID,

  CONSTRAINT "contract_header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_items" (
  "id" UUID NOT NULL,
  "contract_id" UUID NOT NULL,
  "product_id" UUID,
  "description" TEXT,
  "quantity" DECIMAL(12, 3) NOT NULL,
  "uom" TEXT NOT NULL,
  "unit_price" DECIMAL(12, 2) NOT NULL,
  "line_value" DECIMAL(14, 2) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "created_by" UUID,
  "updated_by" UUID,

  CONSTRAINT "contract_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_header_contract_number_key" ON "contract_header"("contract_number");
CREATE INDEX "contract_header_shop_id_start_date_idx" ON "contract_header"("shop_id", "start_date");
CREATE INDEX "contract_header_supplier_id_idx" ON "contract_header"("supplier_id");
CREATE INDEX "contract_items_contract_id_idx" ON "contract_items"("contract_id");

-- AddForeignKey
ALTER TABLE "contract_header"
  ADD CONSTRAINT "contract_header_shop_id_fkey"
  FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_header"
  ADD CONSTRAINT "contract_header_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_header"
  ADD CONSTRAINT "contract_header_rfq_id_fkey"
  FOREIGN KEY ("rfq_id") REFERENCES "rfq_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_header"
  ADD CONSTRAINT "contract_header_quotation_id_fkey"
  FOREIGN KEY ("quotation_id") REFERENCES "supplier_quote_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_items"
  ADD CONSTRAINT "contract_items_contract_id_fkey"
  FOREIGN KEY ("contract_id") REFERENCES "contract_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_items"
  ADD CONSTRAINT "contract_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'purchase_order_header_contract_id_fkey'
  ) THEN
    ALTER TABLE "purchase_order_header"
      ADD CONSTRAINT "purchase_order_header_contract_id_fkey"
      FOREIGN KEY ("contract_id") REFERENCES "contract_header"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
