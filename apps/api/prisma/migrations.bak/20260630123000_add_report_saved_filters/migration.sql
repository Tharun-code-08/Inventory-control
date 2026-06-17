-- Add saved report filters

CREATE TABLE "report_saved_filters" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "report_type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "filter_json" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_saved_filters_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "report_saved_filters_user_id_report_type_idx"
  ON "report_saved_filters"("user_id", "report_type");

ALTER TABLE "report_saved_filters"
  ADD CONSTRAINT "report_saved_filters_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
