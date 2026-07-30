import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/** The outcome of a single delivery decision, mirrored on the metrics labels. */
export type DecisionOutcome =
  | 'DELIVERED'
  | 'SUPPRESSED_DUPLICATE'
  | 'NO_RECIPIENTS'
  | 'FAILED';

export interface DecisionLogEntry {
  eventId: string;
  correlationId: string;
  companyId: string;
  eventType: string;
  recipientUserId?: string | null;
  channel: string;
  priority: string;
  outcome: DecisionOutcome;
  reason: string;
  matchedRule?: string | null;
}

/**
 * Explainability sidecar for the Workflow / Notification Engine. Records *why*
 * each delivery decision was taken (channel, priority, outcome, reason) so
 * support/compliance can answer "why did the system send this?".
 *
 * Best-effort by design: written via guarded raw SQL so it (a) needs no Prisma
 * client regeneration to compile, and (b) NEVER breaks notification delivery —
 * on any environment where the `workflow_decision_logs` migration has not been
 * applied yet, the insert fails and is swallowed with a warning. The typed
 * `WorkflowDecisionLog` model is kept in schema.prisma for drift-detection and
 * future typed reads.
 */
@Injectable()
export class WorkflowDecisionLogService {
  private readonly logger = new Logger(WorkflowDecisionLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: DecisionLogEntry): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO "workflow_decision_logs"
          ("id", "event_id", "correlation_id", "company_id", "event_type",
           "recipient_user_id", "channel", "priority", "outcome", "reason", "matched_rule")
        VALUES (
          ${randomUUID()}::uuid,
          ${entry.eventId}::uuid,
          ${entry.correlationId}::uuid,
          ${entry.companyId}::uuid,
          ${entry.eventType},
          ${entry.recipientUserId ?? null}::uuid,
          ${entry.channel},
          ${entry.priority},
          ${entry.outcome},
          ${entry.reason},
          ${entry.matchedRule ?? null}
        )
      `;
    } catch (err) {
      // Observability must never break delivery. Warn and move on.
      this.logger.warn(
        `decision-log write skipped for event ${entry.eventId}: ${(err as Error).message}`,
      );
    }
  }
}
