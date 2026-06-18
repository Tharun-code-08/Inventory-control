-- CreateTable document_branding
CREATE TABLE "document_branding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "document_branding_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey document_branding to companies
ALTER TABLE "document_branding" ADD CONSTRAINT "document_branding_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "document_branding_company_id_document_type_key" ON "document_branding"("company_id", "document_type");

-- CreateIndex
CREATE INDEX "document_branding_company_id_idx" ON "document_branding"("company_id");
