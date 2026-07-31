-- Digest batching for low-priority customer sends (Plan Phase 3).

CREATE TABLE "dispatch_batch_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "balance_due" DOUBLE PRECISION NOT NULL,
    "tone" TEXT NOT NULL,
    "event_id" UUID NOT NULL,
    "correlation_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dispatch_batch_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dispatch_batch_items_company_id_customer_id_status_idx" ON "dispatch_batch_items"("company_id", "customer_id", "status");
