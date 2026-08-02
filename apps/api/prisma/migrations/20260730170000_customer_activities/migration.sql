-- Internal CRM activity log (Plan §1 "CRM Update" action).

CREATE TABLE "customer_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_activities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "customer_activities_company_id_customer_id_created_at_idx" ON "customer_activities"("company_id", "customer_id", "created_at");
