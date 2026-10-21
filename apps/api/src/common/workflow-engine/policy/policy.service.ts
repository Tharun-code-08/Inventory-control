import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
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

const COMPARATORS = new Set(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in']);
const PRIORITIES = new Set(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']);
const MAX_CONDITION_DEPTH = 10;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Returns why a condition tree is malformed, or null if it is valid. */
export function conditionError(c: unknown, depth = 0): string | null {
  if (depth > MAX_CONDITION_DEPTH) return 'condition is nested too deeply';
  if (!isPlainObject(c)) return 'condition must be an object';
  if ('all' in c || 'any' in c) {
    const list = 'all' in c ? c.all : c.any;
    if (!Array.isArray(list)) return '"all"/"any" must be an array';
    for (const child of list) {
      const err = conditionError(child, depth + 1);
      if (err) return err;
    }
    return null;
  }
  if ('not' in c) return conditionError(c.not, depth + 1);
  if (typeof c.fact !== 'string' || !c.fact) return 'predicate needs a "fact" name';
  if (typeof c.op !== 'string' || !COMPARATORS.has(c.op)) return `unknown comparator "${String(c.op)}"`;
  if (c.op === 'in' && !Array.isArray(c.value)) return '"in" needs an array value';
  return null;
}

/** Returns why a policy action is malformed, or null if it is valid. */
export function actionError(a: unknown): string | null {
  if (!isPlainObject(a)) return 'action must be an object';
  for (const key of ['escalateAfterHours', 'maxPerDay'] as const) {
    if (a[key] !== undefined && (typeof a[key] !== 'number' || !Number.isFinite(a[key]) || (a[key] as number) < 0)) {
      return `"${key}" must be a non-negative number`;
    }
  }
  if (a.priority !== undefined && (typeof a.priority !== 'string' || !PRIORITIES.has(a.priority))) {
    return '"priority" must be LOW, NORMAL, HIGH or CRITICAL';
  }
  if (a.channel !== undefined && typeof a.channel !== 'string') return '"channel" must be a string';
  if (a.suppress !== undefined && typeof a.suppress !== 'boolean') return '"suppress" must be a boolean';
  return null;
}

function assertValidPolicy(input: Partial<PolicyInput>, creating: boolean): void {
  if (creating && (typeof input.name !== 'string' || !input.name.trim())) {
    throw new BadRequestException('Policy name is required');
  }
  if (input.priority !== undefined && !Number.isInteger(input.priority)) {
    throw new BadRequestException('Policy priority must be an integer');
  }
  if (creating || input.condition !== undefined) {
    const err = conditionError(input.condition);
    if (err) throw new BadRequestException(`Invalid policy condition: ${err}`);
  }
  if (creating || input.action !== undefined) {
    const err = actionError(input.action);
    if (err) throw new BadRequestException(`Invalid policy action: ${err}`);
  }
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
    assertValidPolicy(input, true);
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
    assertValidPolicy(input, false);
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
    // A malformed stored rule is skipped rather than failing every dunning event.
    const rules: PolicyRule[] = rows
      .filter((r) => {
        const err = conditionError(r.condition) ?? actionError(r.action);
        if (err) this.logger.warn(`Policy ${r.id} skipped: ${err}`);
        return !err;
      })
      .map((r) => ({
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
