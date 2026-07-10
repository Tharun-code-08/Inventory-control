-- InventoryException table
CREATE TABLE "inventory_exceptions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL,
  "type" text NOT NULL,
  "severity" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'OPEN',
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "first_detected_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_detected_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledged_at" timestamptz(6),
  "acknowledged_by" uuid,
  "resolved_at" timestamptz(6),
  "resolved_by" uuid,
  "resolution_type" text,
  "resolution_notes" text,
  PRIMARY KEY ("id")
);

-- Create unique constraint for deduplication
CREATE UNIQUE INDEX "inventory_exceptions_dedup_idx" ON "inventory_exceptions"("company_id", "type", "entity_type", "entity_id", "status");

-- Create indexes for common queries
CREATE INDEX "inventory_exceptions_status_idx" ON "inventory_exceptions"("company_id", "status", "type");
CREATE INDEX "inventory_exceptions_severity_idx" ON "inventory_exceptions"("company_id", "severity", "status");
CREATE INDEX "inventory_exceptions_time_idx" ON "inventory_exceptions"("company_id", "last_detected_at");

-- CompanyHealthScoreConfig table
CREATE TABLE "company_health_score_configs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL UNIQUE,
  "config" jsonb NOT NULL DEFAULT '{"schemaVersion": 1, "weights": {}}',
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE INDEX "company_health_score_configs_company_idx" ON "company_health_score_configs"("company_id");
