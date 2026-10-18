import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Redis } from 'ioredis';
import { PrismaService } from '@/prisma/prisma.service';
import { REDIS_CLIENT } from '@/common/cache/redis.provider';
import { evaluatePolicies } from './policy-evaluator';
import { PolicyCondition, PolicyAction, PolicyDecision, PolicyFacts, PolicyRule } from './policy-types';

export interface PolicyInput {
  name: string;
  scope?: string;
  enabled?: boolean;
  priority?: number;
  condition: PolicyCondition;
  action: PolicyAction;
}

/**
 * Loads a tenant's {@link NotificationPolicy} rows and evaluates them against a
 * fact set (Plan §7). Rules are cached in Redis per (company, generation, scope)
 * — shared across instances and read on every pipeline pass (Plan §"Caching").
 * A write bumps the company's generation counter, atomically invalidating every
 * cached scope without pattern-deletes; stale keys expire by TTL. Fails open to
 * Postgres if Redis is unavailable.
 */
@Injectable()
export class PolicyService {
  private readonly logger = new Logger(PolicyService.name);
  private static readonly TTL_MS = 30_000;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async decide(companyId: string, scope: string, facts: PolicyFacts): Promise<PolicyDecision> {
    const rules = await this.loadRules(companyId, scope);
    return evaluatePolicies(rules, facts);
  }

  /** Invalidate a company's cache by bumping its generation (best-effort). */
  async invalidate(companyId: string): Promise<void> {
    try {
      await this.redis.incr(`wf:polgen:${companyId}`);
    } catch (err) {
      this.logger.warn(`policy cache invalidation failed (${(err as Error).message})`);
    }
  }

  private async generation(companyId: string): Promise<string> {
    try {
      return (await this.redis.get(`wf:polgen:${companyId}`)) ?? '0';
    } catch {
      return '0';
    }
  }

  // ── CRUD (Plan §7 policy editor) ────────────────────────────────────────────
  list(companyId: string, scope?: string) {
    return this.prisma.notificationPolicy.findMany({
      where: { companyId, ...(scope ? { scope } : {}) },
      orderBy: [{ scope: 'asc' }, { priority: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(companyId: string, input: PolicyInput) {
    const row = await this.prisma.notificationPolicy.create({
      data: {
        companyId,
        name: input.name,
        scope: input.scope ?? 'dunning',
        enabled: input.enabled ?? true,
        priority: input.priority ?? 100,
        condition: input.condition as unknown as Prisma.InputJsonValue,
        action: input.action as unknown as Prisma.InputJsonValue,
      },
    });
    await this.invalidate(companyId);
    return row;
  }

  async update(companyId: string, id: string, input: Partial<PolicyInput>) {
    const existing = await this.prisma.notificationPolicy.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Policy not found');
    const row = await this.prisma.notificationPolicy.update({
      where: { id },
      data: {
        name: input.name,
        scope: input.scope,
        enabled: input.enabled,
        priority: input.priority,
        condition: input.condition ? (input.condition as unknown as Prisma.InputJsonValue) : undefined,
        action: input.action ? (input.action as unknown as Prisma.InputJsonValue) : undefined,
      },
    });
    await this.invalidate(companyId);
    return row;
  }

  async remove(companyId: string, id: string) {
    const existing = await this.prisma.notificationPolicy.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Policy not found');
    await this.prisma.notificationPolicy.delete({ where: { id } });
    await this.invalidate(companyId);
    return { deleted: true };
  }

  private async loadRules(companyId: string, scope: string): Promise<PolicyRule[]> {
    const gen = await this.generation(companyId);
    const cacheKey = `wf:pol:${companyId}:g${gen}:${scope}`;
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as PolicyRule[];
    } catch (err) {
      this.logger.warn(`policy cache read failed (${(err as Error).message}); reading source`);
    }

    const rows = await this.prisma.notificationPolicy.findMany({
      where: { companyId, enabled: true, scope: { in: [scope, '*'] } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
    const rules: PolicyRule[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      priority: r.priority,
      condition: r.condition as unknown as PolicyCondition,
      action: r.action as unknown as PolicyAction,
    }));
    try {
      await this.redis.set(cacheKey, JSON.stringify(rules), 'PX', PolicyService.TTL_MS);
    } catch {
      // Best-effort cache; Postgres is the source of truth.
    }
    return rules;
  }
}
