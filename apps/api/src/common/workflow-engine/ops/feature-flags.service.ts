import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';
import { PrismaService } from '@/prisma/prisma.service';
import { REDIS_CLIENT } from '@/common/cache/redis.provider';

/**
 * Per-tenant feature flags (Plan §10 "Feature Flags"). A flag resolves as:
 *
 *   per-company override (notification_policies scope='feature-flag')
 *     ↳ falls back to the global env default (WORKFLOW_FLAG_<NAME>=true)
 *       ↳ falls back to the built-in default below.
 *
 * This lets AI / Simulation / Workflow Builder / Optimizer be dark-launched and
 * enabled tenant-by-tenant without a deploy. Backed by the existing
 * NotificationPolicy table (scope='feature-flag') to avoid new schema.
 */
export type WorkflowFeature =
  | 'ai-advisor'
  | 'simulation'
  | 'workflow-builder'
  | 'optimizer'
  | 'predictive-ai'
  | 'channel-routing'
  // Hands a tenant's dunning from the ladder sweep over to the workflow graph.
  | 'graph-execution';

const BUILTIN_DEFAULTS: Record<WorkflowFeature, boolean> = {
  'ai-advisor': false,
  simulation: true,
  'workflow-builder': false,
  optimizer: false,
  'predictive-ai': false,
  'channel-routing': false,
  'graph-execution': false,
};

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  /** Redis L2 cache TTL (ms). Shared across instances; invalidated on write. */
  private static readonly TTL_MS = 30_000;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private key(companyId: string, feature: WorkflowFeature): string {
    return `wf:flag:${companyId}:${feature}`;
  }

  async isEnabled(companyId: string, feature: WorkflowFeature): Promise<boolean> {
    const cacheKey = this.key(companyId, feature);
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached !== null) return cached === '1';
    } catch (err) {
      this.logger.warn(`flag cache read failed (${(err as Error).message}); reading source`);
    }

    const override = await this.prisma.notificationPolicy.findFirst({
      where: { companyId, scope: 'feature-flag', name: feature },
    });
    const value = override ? this.readEnabled(override.action) : this.globalDefault(feature);
    await this.cacheSet(cacheKey, value);
    return value;
  }

  /** Set (upsert) a per-company override and invalidate the shared cache. */
  async setEnabled(companyId: string, feature: WorkflowFeature, enabled: boolean): Promise<void> {
    const existing = await this.prisma.notificationPolicy.findFirst({
      where: { companyId, scope: 'feature-flag', name: feature },
    });
    if (existing) {
      await this.prisma.notificationPolicy.update({ where: { id: existing.id }, data: { action: { enabled } } });
    } else {
      await this.prisma.notificationPolicy.create({
        data: { companyId, scope: 'feature-flag', name: feature, condition: {}, action: { enabled }, priority: 0 },
      });
    }
    try {
      await this.redis.del(this.key(companyId, feature));
    } catch (err) {
      this.logger.warn(`flag cache invalidation failed (${(err as Error).message})`);
    }
  }

  private async cacheSet(key: string, value: boolean): Promise<void> {
    try {
      await this.redis.set(key, value ? '1' : '0', 'PX', FeatureFlagsService.TTL_MS);
    } catch {
      // Cache write is best-effort; the source of truth is Postgres/env.
    }
  }

  private globalDefault(feature: WorkflowFeature): boolean {
    const env = this.config.get<string>(`WORKFLOW_FLAG_${feature.toUpperCase().replace(/-/g, '_')}`);
    if (env === 'true') return true;
    if (env === 'false') return false;
    return BUILTIN_DEFAULTS[feature];
  }

  private readEnabled(action: unknown): boolean {
    return typeof action === 'object' && action !== null && (action as { enabled?: unknown }).enabled === true;
  }
}
