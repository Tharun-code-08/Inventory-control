import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export type TimelineKind =
  | 'STEP_PLANNED'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'REPLIED'
  | 'PAID'
  | 'ESCALATED'
  | 'STOPPED'
  | 'SIMULATED';

export interface TimelineEntryInput {
  readonly companyId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly kind: TimelineKind;
  readonly threadId?: string | null;
  readonly correlationId?: string | null;
  readonly channel?: string | null;
  readonly nodeKey?: string | null;
  readonly detail?: Record<string, unknown>;
}

/**
 * Records the human-/machine-readable {@link NotificationTimeline} (Plan §10
 * "Timeline", §12). Every meaningful event on a followup/notification is appended
 * here so a support agent can see the full story and analytics can aggregate it.
 * Best-effort: a timeline write must never break delivery.
 */
@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: TimelineEntryInput): Promise<void> {
    try {
      await this.prisma.notificationTimeline.create({
        data: {
          companyId: entry.companyId,
          entityType: entry.entityType,
          entityId: entry.entityId,
          kind: entry.kind,
          threadId: entry.threadId ?? null,
          correlationId: entry.correlationId ?? null,
          channel: entry.channel ?? null,
          nodeKey: entry.nodeKey ?? null,
          detail: (entry.detail ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.warn(`timeline write skipped (${entry.kind} for ${entry.entityId}): ${(err as Error).message}`);
    }
  }

  /** Full timeline for one entity, oldest-first. */
  async forEntity(companyId: string, entityType: string, entityId: string) {
    return this.prisma.notificationTimeline.findMany({
      where: { companyId, entityType, entityId },
      orderBy: { occurredAt: 'asc' },
    });
  }
}
