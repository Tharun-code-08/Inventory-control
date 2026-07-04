import { Injectable, Logger } from '@nestjs/common';
import type { UserChannelLink } from '@prisma/client';
import { LinkService } from '../link/link.service';
import { ToolRegistry } from '../ai/tools/tool-registry';
import { parseDecision } from './approval';
import { AgentTaskService, type AgentTaskWithSteps } from './agent-task.service';
import { TaskExecutorService } from './task-executor.service';

export const TASK_REPLIES = {
  accountInactive:
    'Your ERP account linked to this number is no longer active. Please contact your administrator.',
  alreadyDecided: (n: number) =>
    `Task #${n} was already processed — nothing left to approve. Ask me for the latest status if unsure.`,
  cancelled: (n: number) => `🗑️ Task #${n} cancelled. Nothing was created.`,
  permissionLost: (n: number, permission: string) =>
    `⛔ Task #${n} cannot be executed: your account no longer has the required permission (${permission}). The draft was cancelled.`,
  failed: (n: number, reason: string) =>
    `❌ Task #${n} failed: ${reason}\nNothing was created — you can ask me to draft it again.`,
} as const;

/**
 * Guard stack for the approve verb, in order: account still active →
 * permission re-check at decision time (not draft time) → atomic
 * WAITING_APPROVAL→RUNNING transition (double-approve executes once) →
 * executor (per-step idempotency keys) → verifier → final task state.
 * Business validation and audit run inside the ERP service the step calls.
 */
@Injectable()
export class TaskFlowService {
  private readonly logger = new Logger(TaskFlowService.name);

  constructor(
    private readonly links: LinkService,
    private readonly tasks: AgentTaskService,
    private readonly executor: TaskExecutorService,
    private readonly registry: ToolRegistry,
  ) {}

  /**
   * Handle an inbound message while a task is pending. Returns the reply for
   * approve/reject, or null when the message is not a decision — the caller
   * then routes it to the AI with the draft in context (the "edit" path).
   */
  async handleDecision(link: UserChannelLink, task: AgentTaskWithSteps, text: string): Promise<string | null> {
    const decision = parseDecision(text);
    if (decision === 'approve') return this.approve(link, task);
    if (decision === 'reject') {
      const cancelled = await this.tasks.cancel(task.id, 'Rejected by user');
      return cancelled ? TASK_REPLIES.cancelled(task.taskNumber) : TASK_REPLIES.alreadyDecided(task.taskNumber);
    }
    return null;
  }

  /** Reminder shown when the AI is unavailable but a decision is pending. */
  pendingReminder(task: AgentTaskWithSteps): string {
    return `⏳ Task #${task.taskNumber} is waiting for your decision:\n\n${task.summary}`;
  }

  private async approve(link: UserChannelLink, task: AgentTaskWithSteps): Promise<string> {
    const user = await this.links.buildRequestUser(link);
    if (!user) return TASK_REPLIES.accountInactive;

    // Permissions may have changed between draft and decision.
    const tool = this.registry.get(task.type);
    const permission = tool?.requiredPermission;
    if (permission && !user.permissions.includes(permission)) {
      await this.tasks.cancel(task.id, `Permission ${permission} missing at approval`);
      return TASK_REPLIES.permissionLost(task.taskNumber, permission);
    }

    const transitioned = await this.tasks.approveTransition(task.id, user.id);
    if (!transitioned) return TASK_REPLIES.alreadyDecided(task.taskNumber);

    const outcome = await this.executor.execute(user, task);
    if (!outcome.ok) {
      await this.tasks.fail(task.id, outcome.error);
      return TASK_REPLIES.failed(task.taskNumber, outcome.error);
    }
    await this.tasks.complete(task.id, outcome.result);
    return outcome.reply;
  }
}
