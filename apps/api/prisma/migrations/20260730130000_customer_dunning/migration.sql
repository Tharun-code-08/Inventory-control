-- CreateTable
CREATE TABLE "customer_contact_channels" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "consent_state" TEXT NOT NULL DEFAULT 'PENDING',
    "consent_at" TIMESTAMPTZ(6),
    "last_engaged_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_contact_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "followup_threads" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "ladder_step" INTEGER NOT NULL DEFAULT -1,
    "current_node_id" TEXT,
    "workflow_version" INTEGER NOT NULL DEFAULT 1,
    "state" TEXT NOT NULL DEFAULT 'ACTIVE',
    "next_action_at" TIMESTAMPTZ(6),
    "last_event_id" UUID,
    "stop_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "followup_threads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_contact_channels_customer_id_channel_key" ON "customer_contact_channels"("customer_id", "channel");

-- CreateIndex
CREATE INDEX "customer_contact_channels_company_id_consent_state_idx" ON "customer_contact_channels"("company_id", "consent_state");

-- CreateIndex
CREATE UNIQUE INDEX "followup_threads_entity_type_entity_id_key" ON "followup_threads"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "followup_threads_company_id_state_next_action_at_idx" ON "followup_threads"("company_id", "state", "next_action_at");

-- CreateIndex
CREATE INDEX "followup_threads_customer_id_idx" ON "followup_threads"("customer_id");
