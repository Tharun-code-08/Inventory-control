-- CreateTable
CREATE TABLE "workflow_decision_logs" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "correlation_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "recipient_user_id" UUID,
    "channel" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "priority_score" INTEGER,
    "outcome" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "matched_rule" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_decision_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workflow_decision_logs_company_id_created_at_idx" ON "workflow_decision_logs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "workflow_decision_logs_event_id_idx" ON "workflow_decision_logs"("event_id");

-- CreateIndex
CREATE INDEX "workflow_decision_logs_correlation_id_idx" ON "workflow_decision_logs"("correlation_id");
