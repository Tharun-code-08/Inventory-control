-- Workflow & Automation Engine — Phase 3–5 models
-- RecipientEngagement, NotificationPolicy, WorkflowGraph/Version/Node,
-- NotificationTimeline, AiMemory. (NotificationDecisionLog already exists as
-- workflow_decision_logs.) String+comment enums, matching the dunning models.

-- CreateTable: recipient_engagements
CREATE TABLE "recipient_engagements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "opened" INTEGER NOT NULL DEFAULT 0,
    "replied" INTEGER NOT NULL DEFAULT 0,
    "paid" INTEGER NOT NULL DEFAULT 0,
    "disputed" INTEGER NOT NULL DEFAULT 0,
    "ignored" INTEGER NOT NULL DEFAULT 0,
    "reliability" INTEGER NOT NULL DEFAULT 50,
    "preferred_hour" INTEGER,
    "last_signal_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "recipient_engagements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "recipient_engagements_customer_id_channel_key" ON "recipient_engagements"("customer_id", "channel");
CREATE INDEX "recipient_engagements_company_id_reliability_idx" ON "recipient_engagements"("company_id", "reliability");

-- CreateTable: notification_policies
CREATE TABLE "notification_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'dunning',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "condition" JSONB NOT NULL DEFAULT '{}',
    "action" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "notification_policies_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notification_policies_company_id_scope_enabled_priority_idx" ON "notification_policies"("company_id", "scope", "enabled", "priority");

-- CreateTable: workflow_graphs
CREATE TABLE "workflow_graphs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latest_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "workflow_graphs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workflow_graphs_company_id_key_key" ON "workflow_graphs"("company_id", "key");

-- CreateTable: workflow_versions
CREATE TABLE "workflow_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "graph_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "document" JSONB NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workflow_versions_graph_id_version_key" ON "workflow_versions"("graph_id", "version");

-- CreateTable: workflow_nodes
CREATE TABLE "workflow_nodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version_id" UUID NOT NULL,
    "node_key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "workflow_nodes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workflow_nodes_version_id_node_key_key" ON "workflow_nodes"("version_id", "node_key");

-- CreateTable: notification_timeline
CREATE TABLE "notification_timeline" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "thread_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "correlation_id" UUID,
    "kind" TEXT NOT NULL,
    "channel" TEXT,
    "node_key" TEXT,
    "detail" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_timeline_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notification_timeline_company_id_entity_type_entity_id_occ_idx" ON "notification_timeline"("company_id", "entity_type", "entity_id", "occurred_at");
CREATE INDEX "notification_timeline_thread_id_occurred_at_idx" ON "notification_timeline"("thread_id", "occurred_at");

-- CreateTable: ai_memory
CREATE TABLE "ai_memory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ai_memory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ai_memory_scope_ref_id_key_key" ON "ai_memory"("scope", "ref_id", "key");
CREATE INDEX "ai_memory_company_id_scope_idx" ON "ai_memory"("company_id", "scope");

-- AddForeignKey
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_graph_id_fkey" FOREIGN KEY ("graph_id") REFERENCES "workflow_graphs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_nodes" ADD CONSTRAINT "workflow_nodes_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "workflow_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
