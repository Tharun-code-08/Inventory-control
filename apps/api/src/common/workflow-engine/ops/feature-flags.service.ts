import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';

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
  private static readonly TTL_MS = 30_000;
  private readonly cache = new Map<string, { at: number; value: boolean }>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async isEnabled(companyId: string, feature: WorkflowFeature): Promise<boolean> {
    const cacheKey = `${companyId}:${feature}`;
    const hit = this.cache.get(cacheKey);
    if (hit && Date.now() - hit.at < FeatureFlagsService.TTL_MS) return hit.value;

    const override = await this.prisma.notificationPolicy.findFirst({
      where: { companyId, scope: 'feature-flag', name: feature },
    });
    const value = override
      ? this.readEnabled(override.action)
      : this.globalDefault(feature);
    this.cache.set(cacheKey, { at: Date.now(), value });
    return value;
  }

  /** Set (upsert) a per-company override. */
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
    this.cache.delete(`${companyId}:${feature}`);
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
