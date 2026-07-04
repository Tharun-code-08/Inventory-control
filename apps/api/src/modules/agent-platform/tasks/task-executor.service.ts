import { Injectable, Logger } from '@nestjs/common';
import { AgentTaskStepStatus, Prisma, type AgentTask, type AgentTaskStep } from '@prisma/client';
import type { RequestUser } from '@/common/types/request-user';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Executor + Verifier halves of the Planner/Executor/Verifier split.
 * A runner executes ONE named step through an existing ERP service (never the
 * DB) and verifies the result shape before it is accepted.
 */
export type TaskStepRunner = {
  /** Step name as stored on AgentTaskStep, e.g. "purchase.create_po". */
  name: string;
  /** Execute with the REQUESTER's RequestUser — same guards as the REST API. */
  run: (
    user: RequestUser,
    payload: Record<string, unknown>,
    task: AgentTask,
    step: AgentTaskStep,
  ) => Promise<unknown>;
  /** Verifier: throw if the result violates the expected invariants. */
  verify: (result: unknown) => void;
  /** One-line WhatsApp reply for a successful result. */
  describe: (result: unknown) => string;
};

export type ExecutionOutcome =
  | { ok: true; reply: string; result: unknown }
  | { ok: false; error: string };

/**
 * Runs an approved AgentTask's steps in order. Each step has its own status
 * and result, so a failed later step (e.g. a notification) never invalidates
 * an earlier completed one (e.g. the created PO). Steps already COMPLETED are
 * skipped, which makes re-execution after a partial failure safe on top of
 * the per-step idempotency keys.
 */
@Injectable()
export class TaskExecutorService {
  private readonly logger = new Logger(TaskExecutorService.name);
  private readonly runners = new Map<string, TaskStepRunner>();

  constructor(private readonly prisma: PrismaService) {}

  registerRunner(runner: TaskStepRunner): void {
    if (this.runners.has(runner.name)) {
      throw new Error(`Task step runner "${runner.name}" is already registered`);
    }
    this.runners.set(runner.name, runner);
    this.logger.log(`Registered task step runner ${runner.name}`);
  }

  async execute(
    user: RequestUser,
    task: AgentTask & { steps: AgentTaskStep[] },
  ): Promise<ExecutionOutcome> {
    const payload = (task.payload ?? {}) as Record<string, unknown>;
    let reply = '';
    let lastResult: unknown = null;

    for (const step of [...task.steps].sort((a, b) => a.order - b.order)) {
      if (step.status === AgentTaskStepStatus.COMPLETED) continue;

      const runner = this.runners.get(step.name);
      if (!runner) {
        const error = `No runner registered for step "${step.name}"`;
        await this.markStep(step.id, AgentTaskStepStatus.FAILED, { error });
        return { ok: false, error };
      }

      await this.prisma.agentTaskStep.update({
        where: { id: step.id },
        data: {
          status: AgentTaskStepStatus.RUNNING,
          attempts: { increment: 1 },
          startedAt: new Date(),
        },
      });

      try {
        const result = await runner.run(user, payload, task, step);
        runner.verify(result);
        await this.markStep(step.id, AgentTaskStepStatus.COMPLETED, { result });
        lastResult = result;
        reply = runner.describe(result);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Task ${task.id} step ${step.name} failed: ${error}`);
        await this.markStep(step.id, AgentTaskStepStatus.FAILED, { error });
        return { ok: false, error };
      }
    }

    return { ok: true, reply, result: lastResult };
  }

  private async markStep(
    stepId: string,
    status: AgentTaskStepStatus,
    data: { result?: unknown; error?: string },
  ): Promise<void> {
    await this.prisma.agentTaskStep.update({
      where: { id: stepId },
      data: {
        status,
        ...(data.result !== undefined ? { result: data.result as Prisma.InputJsonValue } : {}),
        ...(data.error ? { error: data.error.slice(0, 500) } : {}),
        completedAt: new Date(),
      },
    });
  }
}
