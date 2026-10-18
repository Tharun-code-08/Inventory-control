import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AiAdvisor, AdvisorInput, AiRecommendation, RuleBasedAdvisor } from './ai-advisor';

/**
 * Wraps the active {@link AiAdvisor} and persists what it learns to
 * {@link AiMemory} (Plan §8, §9 data models). Persisting a recommendation is
 * *advisory memory only* — nothing here changes a send; the pipeline reads these
 * hints and always lets business rules win.
 *
 * Ships with {@link RuleBasedAdvisor} so it works with no API key. A real LLM
 * advisor can be injected in its place behind a feature flag.
 */
@Injectable()
export class AiAdvisorService {
  private readonly logger = new Logger(AiAdvisorService.name);
  private readonly advisor: AiAdvisor = new RuleBasedAdvisor();

  constructor(private readonly prisma: PrismaService) {}

  /** Produce a recommendation and remember the salient parts. Never throws. */
  async advise(input: AdvisorInput): Promise<AiRecommendation> {
    const rec = this.advisor.recommend(input);
    try {
      await this.remember(input, rec);
    } catch (err) {
      this.logger.warn(`ai-memory write skipped for customer ${input.customerId}: ${(err as Error).message}`);
    }
    return rec;
  }

  private async remember(input: AdvisorInput, rec: AiRecommendation): Promise<void> {
    const writes: Array<Promise<unknown>> = [];
    if (rec.channel) {
      writes.push(this.upsertMemory(input.companyId, 'customer', input.customerId, 'channel-preference', { channel: rec.channel }, rec.confidence));
    }
    if (rec.sendHour !== undefined) {
      writes.push(this.upsertMemory(input.companyId, 'customer', input.customerId, 'send-hour', { hour: rec.sendHour }, rec.confidence));
    }
    if (rec.tone) {
      writes.push(this.upsertMemory(input.companyId, 'customer', input.customerId, 'tone', { tone: rec.tone }, rec.confidence));
    }
    await Promise.all(writes);
  }

  private upsertMemory(
    companyId: string,
    scope: string,
    refId: string,
    key: string,
    value: Prisma.InputJsonValue,
    confidence: number,
  ): Promise<unknown> {
    return this.prisma.aiMemory.upsert({
      where: { scope_refId_key: { scope, refId, key } },
      update: { value, confidence, companyId },
      create: { companyId, scope, refId, key, value, confidence },
    });
  }

  /** Read back a stored hint (used by the pipeline / analytics accuracy checks). */
  async recall(scope: string, refId: string, key: string): Promise<Prisma.JsonValue | null> {
    const row = await this.prisma.aiMemory.findUnique({ where: { scope_refId_key: { scope, refId, key } } });
    return row?.value ?? null;
  }
}
