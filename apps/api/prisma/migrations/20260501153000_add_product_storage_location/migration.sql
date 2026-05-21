-- Add optional storage location reference to products
ALTER TABLE "products"
ADD COLUMN "storage_location_id" UUID;

ALTER TABLE "products"
ADD CONSTRAINT "products_storage_location_id_fkey"
FOREIGN KEY ("storage_location_id") REFERENCES "storage_locations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "products_storage_location_id_idx" ON "products"("storage_location_id");
