import { Injectable, Logger } from '@nestjs/common';
import { AgentTaskStatus, Prisma, type AgentTask, type AgentTaskStep } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export type AgentTaskWithSteps = AgentTask & { steps: AgentTaskStep[] };

export type CreateDraftInput = {
  companyId: string;
  conversationId: string;
  requestedById: string;
  /** Canonical action id, e.g. "purchase.create_po". */
  type: string;
  /** Validated service-layer payload executed on approval. */
  payload: Record<string, unknown>;
  /** Human-readable summary exactly as presented to the user. */
  summary: string;
  /** Ordered step-runner names (usually just the action itself). */
  steps: string[];
};

/**
 * AgentTask lifecycle: DRAFT → WAITING_APPROVAL → RUNNING → COMPLETED/FAILED,
 * or → CANCELLED while still waiting. Business state lives here, not in the
 * conversation. All transitions are atomic conditional updates (`updateMany`
 * guarded by the current status), so a double "approve" — even from two
 * concurrent webhook deliveries — can transition exactly one of them.
 */
@Injectable()
export class AgentTaskService {
  private readonly logger = new Logger(AgentTaskService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a draft and present it for approval. Any previous pending task in
   * the conversation is superseded (cancelled) — the newest draft is the only
   * approvable one, which is how "edit" re-drafting stays unambiguous.
   */
  async createDraft(input: CreateDraftInput): Promise<AgentTaskWithSteps> {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.agentTask.create({
        data: {
          companyId: input.companyId,
          conversationId: input.conversationId,
          requestedById: input.requestedById,
          type: input.type,
          status: AgentTaskStatus.WAITING_APPROVAL,
          payload: input.payload as Prisma.InputJsonValue,
          summary: input.summary,
          steps: {
            create: input.steps.map((name, index) => ({ name, order: index + 1 })),
          },
        },
        include: { steps: { orderBy: { order: 'asc' } } },
      });
      await tx.agentTask.updateMany({
        where: {
          conversationId: input.conversationId,
          status: AgentTaskStatus.WAITING_APPROVAL,
          id: { not: task.id },
        },
        data: {
          status: AgentTaskStatus.CANCELLED,
          failureReason: `Superseded by task #${task.taskNumber}`,
        },
      });
      return task;
    });
  }

  /** Latest task in this conversation still waiting for a decision. */
  async findPending(conversationId: string): Promise<AgentTaskWithSteps | null> {
    return this.prisma.agentTask.findFirst({
      where: { conversationId, status: AgentTaskStatus.WAITING_APPROVAL },
      orderBy: { createdAt: 'desc' },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  /**
   * WAITING_APPROVAL → RUNNING, exactly once. Returns false when the task was
   * already approved/cancelled (the concurrent-approve guard).
   */
  async approveTransition(taskId: string, approvedById: string): Promise<boolean> {
    const { count } = await this.prisma.agentTask.updateMany({
      where: { id: taskId, status: AgentTaskStatus.WAITING_APPROVAL },
      data: {
        status: AgentTaskStatus.RUNNING,
        approvedById,
        approvedAt: new Date(),
      },
    });
    return count === 1;
  }

  /** WAITING_APPROVAL → CANCELLED, exactly once. */
  async cancel(taskId: string, reason: string): Promise<boolean> {
    const { count } = await this.prisma.agentTask.updateMany({
      where: { id: taskId, status: AgentTaskStatus.WAITING_APPROVAL },
      data: { status: AgentTaskStatus.CANCELLED, failureReason: reason },
    });
    return count === 1;
  }

  async complete(taskId: string, result: unknown): Promise<void> {
    await this.prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: AgentTaskStatus.COMPLETED,
        result: result as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
  }

  async fail(taskId: string, reason: string): Promise<void> {
    await this.prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: AgentTaskStatus.FAILED,
        failureReason: reason.slice(0, 500),
        completedAt: new Date(),
      },
    });
  }
}
