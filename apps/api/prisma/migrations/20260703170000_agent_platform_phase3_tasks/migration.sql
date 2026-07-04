-- Agent Platform (Phase 3): AgentTask engine — drafted business actions with
-- ordered execution steps, replacing the never-used conversations.pending_draft.
-- Hand-curated (P3006 shadow-DB workaround; never apply raw `migrate diff`).

-- CreateEnum
CREATE TYPE "AgentTaskStatus" AS ENUM ('DRAFT', 'WAITING_APPROVAL', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgentTaskStepStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- AlterTable: business drafts move to agent_tasks
ALTER TABLE "conversations" DROP COLUMN "pending_draft";

-- CreateTable
CREATE TABLE "agent_tasks" (
    "id" UUID NOT NULL,
    "task_number" SERIAL NOT NULL,
    "company_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "status" "AgentTaskStatus" NOT NULL DEFAULT 'DRAFT',
    "payload" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "result" JSONB,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "agent_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_task_steps" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AgentTaskStepStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "result" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "agent_task_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_tasks_task_number_key" ON "agent_tasks"("task_number");

-- CreateIndex
CREATE INDEX "agent_tasks_conversation_id_status_idx" ON "agent_tasks"("conversation_id", "status");

-- CreateIndex
CREATE INDEX "agent_tasks_company_id_created_at_idx" ON "agent_tasks"("company_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "agent_task_steps_task_id_order_key" ON "agent_task_steps"("task_id", "order");

-- AddForeignKey
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_task_steps" ADD CONSTRAINT "agent_task_steps_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "agent_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
