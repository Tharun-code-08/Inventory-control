import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
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
 * fact set (Plan §7). Results are cached briefly per (company, scope) — policies
 * change rarely but are read on every pipeline pass (Plan §"Caching").
 */
@Injectable()
export class PolicyService {
  private static readonly TTL_MS = 30_000;
  private readonly cache = new Map<string, { at: number; rules: PolicyRule[] }>();

  constructor(private readonly prisma: PrismaService) {}

  async decide(companyId: string, scope: string, facts: PolicyFacts): Promise<PolicyDecision> {
    const rules = await this.loadRules(companyId, scope);
    return evaluatePolicies(rules, facts);
  }

  /** Invalidate the cache for a company (call after editing policies). */
  invalidate(companyId: string): void {
    for (const key of [...this.cache.keys()]) {
      if (key.startsWith(`${companyId}:`)) this.cache.delete(key);
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
    this.invalidate(companyId);
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
    this.invalidate(companyId);
    return row;
  }

  async remove(companyId: string, id: string) {
    const existing = await this.prisma.notificationPolicy.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Policy not found');
    await this.prisma.notificationPolicy.delete({ where: { id } });
    this.invalidate(companyId);
    return { deleted: true };
  }

  private async loadRules(companyId: string, scope: string): Promise<PolicyRule[]> {
    const cacheKey = `${companyId}:${scope}`;
    const hit = this.cache.get(cacheKey);
    if (hit && Date.now() - hit.at < PolicyService.TTL_MS) return hit.rules;

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
    this.cache.set(cacheKey, { at: Date.now(), rules });
    return rules;
  }
}
