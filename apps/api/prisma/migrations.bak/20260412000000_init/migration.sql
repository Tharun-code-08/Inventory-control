-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('ADMIN', 'SHOP_USER', 'INVENTORY_MANAGER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'POSTED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('OPENING', 'GOODS_RECEIPT', 'GOODS_ISSUE', 'DAMAGE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'POST', 'EXPORT');

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" "RoleName" NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shops" (
    "id" UUID NOT NULL,
    "shop_number" TEXT NOT NULL,
    "shop_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contact_person" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_id" UUID NOT NULL,
    "shop_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "refresh_token_hash" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "product_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "uom" TEXT NOT NULL,
    "shop_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "purchase_price" DECIMAL(12,2) NOT NULL,
    "selling_price" DECIMAL(12,2) NOT NULL,
    "min_stock_level" DECIMAL(12,3) NOT NULL,
    "opening_stock" DECIMAL(12,3) NOT NULL,
    "reorder_qty" DECIMAL(12,3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_header" (
    "id" UUID NOT NULL,
    "gr_number" TEXT NOT NULL,
    "gr_date" DATE NOT NULL,
    "shop_id" UUID NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "supplier_ref" TEXT,
    "remarks" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "posted_at" TIMESTAMPTZ(6),
    "total_value" DECIMAL(14,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "goods_receipt_header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_items" (
    "id" UUID NOT NULL,
    "gr_header_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "uom" TEXT NOT NULL,
    "purchase_rate" DECIMAL(12,2) NOT NULL,
    "line_value" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "goods_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_issue_header" (
    "id" UUID NOT NULL,
    "gi_number" TEXT NOT NULL,
    "gi_date" DATE NOT NULL,
    "shop_id" UUID NOT NULL,
    "issue_reason" TEXT NOT NULL,
    "remarks" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "posted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "goods_issue_header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_issue_items" (
    "id" UUID NOT NULL,
    "gi_header_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "uom" TEXT NOT NULL,
    "available_stock_snapshot" DECIMAL(12,3) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "goods_issue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "damaged_stock" (
    "id" UUID NOT NULL,
    "damage_number" TEXT NOT NULL,
    "damage_date" DATE NOT NULL,
    "shop_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "damaged_quantity" DECIMAL(12,3) NOT NULL,
    "reason" TEXT NOT NULL,
    "remarks" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "posted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "damaged_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_header" (
    "id" UUID NOT NULL,
    "po_number" TEXT NOT NULL,
    "po_date" DATE NOT NULL,
    "shop_id" UUID NOT NULL,
    "supplier" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "total_value" DECIMAL(14,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "purchase_order_header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" UUID NOT NULL,
    "po_header_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "current_stock" DECIMAL(12,3) NOT NULL,
    "min_stock" DECIMAL(12,3) NOT NULL,
    "suggested_qty" DECIMAL(12,3) NOT NULL,
    "order_qty" DECIMAL(12,3) NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "line_value" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_ledger" (
    "id" UUID NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "transaction_ref" TEXT NOT NULL,
    "transaction_date" DATE NOT NULL,
    "shop_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "in_qty" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "out_qty" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "balance_qty" DECIMAL(12,3) NOT NULL,
    "unit_rate" DECIMAL(12,2),
    "value" DECIMAL(14,2),
    "remarks" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "stock_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_summary" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "current_stock" DECIMAL(12,3) NOT NULL,
    "last_movement_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "stock_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" UUID NOT NULL,
    "doc_type" TEXT NOT NULL,
    "shop_id" UUID NOT NULL,
    "year_month" TEXT NOT NULL,
    "last_seq" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "shops_shop_number_key" ON "shops"("shop_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "products_shop_id_product_code_idx" ON "products"("shop_id", "product_code");

-- CreateIndex
CREATE UNIQUE INDEX "products_shop_id_product_code_key" ON "products"("shop_id", "product_code");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipt_header_gr_number_key" ON "goods_receipt_header"("gr_number");

-- CreateIndex
CREATE UNIQUE INDEX "goods_issue_header_gi_number_key" ON "goods_issue_header"("gi_number");

-- CreateIndex
CREATE UNIQUE INDEX "damaged_stock_damage_number_key" ON "damaged_stock"("damage_number");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_header_po_number_key" ON "purchase_order_header"("po_number");

-- CreateIndex
CREATE INDEX "stock_ledger_shop_id_product_id_transaction_date_idx" ON "stock_ledger"("shop_id", "product_id", "transaction_date");

-- CreateIndex
CREATE UNIQUE INDEX "stock_summary_shop_id_product_id_key" ON "stock_summary"("shop_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_doc_type_shop_id_year_month_key" ON "document_sequences"("doc_type", "shop_id", "year_month");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_header" ADD CONSTRAINT "goods_receipt_header_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_gr_header_id_fkey" FOREIGN KEY ("gr_header_id") REFERENCES "goods_receipt_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_issue_header" ADD CONSTRAINT "goods_issue_header_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_issue_items" ADD CONSTRAINT "goods_issue_items_gi_header_id_fkey" FOREIGN KEY ("gi_header_id") REFERENCES "goods_issue_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_issue_items" ADD CONSTRAINT "goods_issue_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damaged_stock" ADD CONSTRAINT "damaged_stock_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damaged_stock" ADD CONSTRAINT "damaged_stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_header" ADD CONSTRAINT "purchase_order_header_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_po_header_id_fkey" FOREIGN KEY ("po_header_id") REFERENCES "purchase_order_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_summary" ADD CONSTRAINT "stock_summary_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_summary" ADD CONSTRAINT "stock_summary_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Full-text search on products (code + description)
CREATE INDEX "products_description_fts_idx" ON "products" USING gin (to_tsvector('english', coalesce("product_code", '') || ' ' || coalesce("description", '')));

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_updated_at ON roles;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at ON shops;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at ON users;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at ON products;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at ON goods_receipt_header;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON goods_receipt_header FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at ON goods_receipt_items;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON goods_receipt_items FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at ON goods_issue_header;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON goods_issue_header FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at ON goods_issue_items;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON goods_issue_items FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at ON damaged_stock;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON damaged_stock FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at ON purchase_order_header;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON purchase_order_header FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at ON purchase_order_items;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON purchase_order_items FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at ON stock_ledger;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON stock_ledger FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at ON stock_summary;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON stock_summary FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at ON document_sequences;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON document_sequences FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_updated_at ON system_settings;
CREATE TRIGGER trg_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

-- Stock ledger: prevent negative balance on outbound movement
CREATE OR REPLACE FUNCTION trg_stock_ledger_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  prev numeric(12,3);
  projected numeric(12,3);
BEGIN
  IF NEW.out_qty > 0 THEN
    SELECT balance_qty INTO prev
    FROM stock_ledger
    WHERE shop_id = NEW.shop_id AND product_id = NEW.product_id
    ORDER BY transaction_date DESC, created_at DESC, id DESC
    LIMIT 1;

    projected := COALESCE(prev, 0) + NEW.in_qty - NEW.out_qty;
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

-- Stock ledger: set running balance + upsert summary
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

  new_bal := prev + NEW.in_qty - NEW.out_qty;

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
