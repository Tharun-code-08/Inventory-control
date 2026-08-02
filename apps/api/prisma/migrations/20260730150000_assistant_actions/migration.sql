-- Autonomous-assistant proposals awaiting human approval (Plan Phase 7).

CREATE TABLE "assistant_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rationale" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_by" UUID,
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assistant_actions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "assistant_actions_company_id_status_kind_idx" ON "assistant_actions"("company_id", "status", "kind");
