-- AddEnum: ExpiryTracking
CREATE TYPE "ExpiryTracking" AS ENUM ('NONE', 'OPTIONAL', 'MANDATORY');

-- AddEnum: InventoryLotStatus
CREATE TYPE "InventoryLotStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'CONSUMED', 'SCRAPPED');

-- AddEnum: StockTransferCreatedVia
CREATE TYPE "StockTransferCreatedVia" AS ENUM ('MANUAL', 'DRAG_DROP', 'BULK', 'API');

-- AddEnum: Add STOCK_EXPIRING, STOCK_EXPIRED to AlertType
ALTER TYPE "AlertType" ADD VALUE 'STOCK_EXPIRING' BEFORE 'CONTRACT_EXPIRY';
ALTER TYPE "AlertType" ADD VALUE 'STOCK_EXPIRED' BEFORE 'CONTRACT_EXPIRY';

-- AlterTable: Product - add shelf_life_days and expiry_tracking
ALTER TABLE "products" ADD COLUMN "shelf_life_days" INTEGER,
ADD COLUMN "expiry_tracking" "ExpiryTracking" NOT NULL DEFAULT 'OPTIONAL';

-- AlterTable: StockTransferHeader - add createdVia and dispatch/receive tracking
ALTER TABLE "stock_transfer_header" ADD COLUMN "created_via" "StockTransferCreatedVia" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "dispatched_at" TIMESTAMPTZ(6),
ADD COLUMN "received_at" TIMESTAMPTZ(6),
ADD COLUMN "dispatched_by" UUID,
ADD COLUMN "received_by" UUID;

-- CreateTable: InventoryLot
CREATE TABLE "inventory_lots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "lot_number" TEXT NOT NULL,
    "expiry_date" DATE,
    "qty_received" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "qty_on_hand" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(14,4),
    "status" "InventoryLotStatus" NOT NULL DEFAULT 'ACTIVE',
    "storage_location_id" UUID,
    "gr_item_id" UUID,
    "blocked_at" TIMESTAMPTZ(6),
    "blocked_reason" TEXT,
    "scrapped_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "inventory_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable: GoodsIssueItemLot
CREATE TABLE "goods_issue_item_lots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gi_item_id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "goods_issue_item_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable: StockTransferItemLot
CREATE TABLE "stock_transfer_item_lots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transfer_item_id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "stock_transfer_item_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable: StockTransferStatusHistory
CREATE TABLE "stock_transfer_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transfer_id" UUID NOT NULL,
    "from_status" "DocumentStatus",
    "to_status" "DocumentStatus" NOT NULL,
    "changed_by" UUID,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "stock_transfer_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InventoryLotAlert
CREATE TABLE "inventory_lot_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lot_id" UUID NOT NULL,
    "threshold" INTEGER NOT NULL,
    "event_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_lot_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: InventoryLot indexes
CREATE UNIQUE INDEX "inventory_lots_shop_id_product_id_lot_number_key" ON "inventory_lots"("shop_id", "product_id", "lot_number");
CREATE INDEX "inventory_lots_shop_id_product_id_status_expiry_date_idx" ON "inventory_lots"("shop_id", "product_id", "status", "expiry_date");
CREATE INDEX "inventory_lots_company_id_status_expiry_date_idx" ON "inventory_lots"("company_id", "status", "expiry_date");

-- CreateIndex: GoodsIssueItemLot indexes
CREATE UNIQUE INDEX "goods_issue_item_lots_gi_item_id_lot_id_key" ON "goods_issue_item_lots"("gi_item_id", "lot_id");
CREATE INDEX "goods_issue_item_lots_lot_id_idx" ON "goods_issue_item_lots"("lot_id");

-- CreateIndex: StockTransferItemLot indexes
CREATE UNIQUE INDEX "stock_transfer_item_lots_transfer_item_id_lot_id_key" ON "stock_transfer_item_lots"("transfer_item_id", "lot_id");
CREATE INDEX "stock_transfer_item_lots_lot_id_idx" ON "stock_transfer_item_lots"("lot_id");

-- CreateIndex: StockTransferStatusHistory indexes
CREATE INDEX "stock_transfer_status_history_transfer_id_changed_at_idx" ON "stock_transfer_status_history"("transfer_id", "changed_at");

-- CreateIndex: InventoryLotAlert indexes
CREATE UNIQUE INDEX "inventory_lot_alerts_lot_id_threshold_key" ON "inventory_lot_alerts"("lot_id", "threshold");

-- AddForeignKey: InventoryLot
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_storage_location_id_fkey" FOREIGN KEY ("storage_location_id") REFERENCES "storage_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_gr_item_id_fkey" FOREIGN KEY ("gr_item_id") REFERENCES "goods_receipt_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: GoodsIssueItemLot
ALTER TABLE "goods_issue_item_lots" ADD CONSTRAINT "goods_issue_item_lots_gi_item_id_fkey" FOREIGN KEY ("gi_item_id") REFERENCES "goods_issue_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goods_issue_item_lots" ADD CONSTRAINT "goods_issue_item_lots_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: StockTransferItemLot
ALTER TABLE "stock_transfer_item_lots" ADD CONSTRAINT "stock_transfer_item_lots_transfer_item_id_fkey" FOREIGN KEY ("transfer_item_id") REFERENCES "stock_transfer_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_item_lots" ADD CONSTRAINT "stock_transfer_item_lots_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: StockTransferStatusHistory
ALTER TABLE "stock_transfer_status_history" ADD CONSTRAINT "stock_transfer_status_history_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "stock_transfer_header"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: InventoryLotAlert
ALTER TABLE "inventory_lot_alerts" ADD CONSTRAINT "inventory_lot_alerts_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
