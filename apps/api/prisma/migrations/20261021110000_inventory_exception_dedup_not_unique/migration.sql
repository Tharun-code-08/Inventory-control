-- The unique index included status, so a second RESOLVED row for the same
-- entity violated it and an exception could never be resolved again. Dedupe is
-- done in code (entity + plant + issue); keep the same columns as a plain index.
DROP INDEX IF EXISTS "inventory_exceptions_dedup_idx";
CREATE INDEX "inventory_exceptions_dedup_idx" ON "inventory_exceptions"("company_id", "type", "entity_type", "entity_id", "status");
