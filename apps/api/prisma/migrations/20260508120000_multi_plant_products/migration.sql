-- Multi-plant product master.
--
-- Splits per-plant inventory data off the global products row. After this
-- migration:
--   - products holds only master/master-data fields (productCode globally unique).
--   - product_plants holds (productId, shopId, storageLocationId, opening/min/max stock).
--   - product_specifications holds {label, value} key/value pairs.
--
-- Existing data is preserved by:
--   - Suffixing duplicate productCodes with the plant's shop_number (so the new
--     productCode-global-unique constraint can be applied without collisions).
--   - Backfilling product_plants from the legacy single-plant Product columns.
--
-- The legacy columns (shop_id, storage_location_id, opening_stock,
-- min_stock_level, reorder_qty) are dropped at the end. This is one-way; back
-- up the database before applying.

-- 1. Create the new tables.
CREATE TABLE "product_plants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "storage_location_id" UUID,
    "opening_stock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "min_stock_level" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "max_stock_level" DECIMAL(12,3),
    "reorder_qty" DECIMAL(12,3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "product_plants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_plants_product_id_shop_id_key" ON "product_plants"("product_id", "shop_id");
CREATE INDEX "product_plants_shop_id_idx" ON "product_plants"("shop_id");
CREATE INDEX "product_plants_storage_location_id_idx" ON "product_plants"("storage_location_id");

ALTER TABLE "product_plants"
    ADD CONSTRAINT "product_plants_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_plants"
    ADD CONSTRAINT "product_plants_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_plants"
    ADD CONSTRAINT "product_plants_storage_location_id_fkey"
    FOREIGN KEY ("storage_location_id") REFERENCES "storage_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Mirror the updated_at trigger used elsewhere in the schema so PATCH writes
-- automatically bump updated_at without application changes.
DROP TRIGGER IF EXISTS trg_updated_at ON product_plants;
CREATE TRIGGER trg_updated_at
    BEFORE UPDATE ON product_plants
    FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

CREATE TABLE "product_specifications" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_specifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_specifications_product_id_sort_order_idx"
    ON "product_specifications"("product_id", "sort_order");

ALTER TABLE "product_specifications"
    ADD CONSTRAINT "product_specifications_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TRIGGER IF EXISTS trg_updated_at ON product_specifications;
CREATE TRIGGER trg_updated_at
    BEFORE UPDATE ON product_specifications
    FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

-- 2. Add new master-data columns to products.
ALTER TABLE "products" ADD COLUMN "material_group" TEXT;
ALTER TABLE "products" ADD COLUMN "drawing_reference" TEXT;

-- 3. Resolve duplicate product_codes by suffixing with the plant's
-- shop_number. Keeps the oldest row per code as the "canonical" master.
UPDATE "products" AS p
SET    "product_code" = p."product_code" || '-' || s."shop_number"
FROM   "shops" AS s
WHERE  p."shop_id" = s."id"
  AND  p."id" NOT IN (
       SELECT DISTINCT ON ("product_code") "id"
       FROM   "products"
       ORDER  BY "product_code", "created_at"
  );

-- 4. Backfill product_plants from existing per-shop products. Each existing
-- products row becomes one assignment carrying its prior stock fields.
INSERT INTO "product_plants" (
    "id", "product_id", "shop_id", "storage_location_id",
    "opening_stock", "min_stock_level", "max_stock_level", "reorder_qty",
    "is_active", "created_at", "updated_at", "created_by", "updated_by"
)
SELECT
    gen_random_uuid(),
    "id",
    "shop_id",
    "storage_location_id",
    "opening_stock",
    "min_stock_level",
    NULL,
    "reorder_qty",
    "is_active",
    "created_at",
    "updated_at",
    "created_by",
    "updated_by"
FROM "products";

-- 5. Replace the per-shop unique with a global unique on product_code.
-- Note: the per-shop unique was created via CREATE UNIQUE INDEX, so it lives
-- as an index, not a table constraint -- DROP INDEX (not DROP CONSTRAINT).
DROP INDEX "products_shop_id_product_code_idx";
DROP INDEX "products_shop_id_product_code_key";
CREATE UNIQUE INDEX "products_product_code_key" ON "products"("product_code");

-- The storage_location index is replaced by the one on product_plants.
DROP INDEX IF EXISTS "products_storage_location_id_idx";

-- 6. Drop the legacy single-plant FKs and columns.
ALTER TABLE "products" DROP CONSTRAINT "products_shop_id_fkey";
ALTER TABLE "products" DROP CONSTRAINT "products_storage_location_id_fkey";

ALTER TABLE "products" DROP COLUMN "shop_id";
ALTER TABLE "products" DROP COLUMN "storage_location_id";
ALTER TABLE "products" DROP COLUMN "opening_stock";
ALTER TABLE "products" DROP COLUMN "min_stock_level";
ALTER TABLE "products" DROP COLUMN "reorder_qty";
