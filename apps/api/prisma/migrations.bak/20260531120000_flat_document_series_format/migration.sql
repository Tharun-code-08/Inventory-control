-- Flatten document number series: prefix + sequence only (no plant code or period bucket in the number).
UPDATE "document_series_config"
SET "restart_period" = 'NONE', "shop_scoped" = false
WHERE "restart_period" <> 'NONE' OR "shop_scoped" = true;

ALTER TABLE "document_series_config" ALTER COLUMN "restart_period" SET DEFAULT 'NONE';
ALTER TABLE "document_series_config" ALTER COLUMN "shop_scoped" SET DEFAULT false;
