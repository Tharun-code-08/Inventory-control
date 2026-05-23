-- Ensure storage_locations exists (older environments may be missing it).
CREATE TABLE IF NOT EXISTS "storage_locations" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "storage_locations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "storage_locations_shop_id_code_key" ON "storage_locations"("shop_id", "code");
CREATE INDEX IF NOT EXISTS "storage_locations_shop_id_code_idx" ON "storage_locations"("shop_id", "code");

ALTER TABLE "storage_locations"
    ADD CONSTRAINT "storage_locations_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep updated_at in sync with other tables.
DROP TRIGGER IF EXISTS trg_updated_at ON storage_locations;
CREATE TRIGGER trg_updated_at
    BEFORE UPDATE ON storage_locations
    FOR EACH ROW EXECUTE PROCEDURE trg_set_updated_at();

-- Add optional storage location reference to products
ALTER TABLE "products"
ADD COLUMN "storage_location_id" UUID;

ALTER TABLE "products"
ADD CONSTRAINT "products_storage_location_id_fkey"
FOREIGN KEY ("storage_location_id") REFERENCES "storage_locations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "products_storage_location_id_idx" ON "products"("storage_location_id");
