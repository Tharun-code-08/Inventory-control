-- CreateEnum
CREATE TYPE "DocumentSeriesRestart" AS ENUM ('NONE', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "document_series_config" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "shop_id" UUID,
    "doc_type" TEXT NOT NULL,
    "module_label" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "starting_number" INTEGER NOT NULL DEFAULT 1,
    "pad_width" INTEGER NOT NULL DEFAULT 5,
    "restart_period" "DocumentSeriesRestart" NOT NULL DEFAULT 'MONTHLY',
    "shop_scoped" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "use_category_prefix" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "document_series_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_series_config_company_id_doc_type_idx" ON "document_series_config"("company_id", "doc_type");

-- CreateIndex
CREATE INDEX "document_series_config_company_id_shop_id_doc_type_idx" ON "document_series_config"("company_id", "shop_id", "doc_type");

-- Partial unique indexes (shop_id NULL = company default)
CREATE UNIQUE INDEX "document_series_config_company_default_unique"
ON "document_series_config" ("company_id", "doc_type")
WHERE "shop_id" IS NULL;

CREATE UNIQUE INDEX "document_series_config_shop_override_unique"
ON "document_series_config" ("company_id", "shop_id", "doc_type")
WHERE "shop_id" IS NOT NULL;

-- AddForeignKey
DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL
     AND to_regclass('public.document_series_config') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'document_series_config_company_id_fkey'
     ) THEN
    ALTER TABLE "document_series_config"
      ADD CONSTRAINT "document_series_config_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
ALTER TABLE "document_series_config" ADD CONSTRAINT "document_series_config_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
