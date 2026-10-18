import { Injectable } from '@nestjs/common';
import { WorkflowRegistryService } from '../graph/workflow-registry.service';
import { driveWorkflow, RuntimeContext } from '../graph/workflow-runtime';
import { ConditionSpec } from '../graph/graph-types';

/**
 * Simulation engine (Plan §10 "Simulation Engine"). Dry-runs a workflow over a
 * hypothetical scenario and returns the timeline it *would* produce. **No
 * messages are sent** and nothing is persisted — this is the "what happens if
 * this invoice goes N days overdue and is never paid?" preview.
 */
export interface SimulationScenario {
  readonly companyId: string;
  readonly workflowKey?: string; // defaults to "invoice-dunning"
  readonly startAt?: Date;
  /** Day (relative to start) the invoice is paid; omit = never paid. */
  readonly paidOnDay?: number;
  /** Day the customer replies; omit = never. */
  readonly repliedOnDay?: number;
}

export interface SimulatedStep {
  readonly day: number;
  readonly at: string;
  readonly kind: string;
  readonly nodeKey: string;
  readonly detail: string;
}

@Injectable()
export class SimulationService {
  constructor(private readonly registry: WorkflowRegistryService) {}

  async simulate(scenario: SimulationScenario): Promise<SimulatedStep[]> {
    const key = scenario.workflowKey ?? 'invoice-dunning';
    const published = await this.registry.getPublished(scenario.companyId, key);
    if (!published) throw new Error(`No published workflow "${key}" for company ${scenario.companyId}.`);

    const start = scenario.startAt ?? new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const dayOf = (d: Date) => Math.round((d.getTime() - start.getTime()) / dayMs);

    const makeContext = (now: Date): RuntimeContext => ({
      now,
      evalCondition: (spec: ConditionSpec) => this.evalScenario(spec, dayOf(now), scenario),
    });

    const steps = driveWorkflow(published.workflow, makeContext, { start });
    return steps.map((s) => ({
      day: dayOf(s.at),
      at: s.at.toISOString(),
      kind: s.result.kind,
      nodeKey: s.result.nodeKey,
      detail: this.describe(s.result),
    }));
  }

  private evalScenario(spec: ConditionSpec, day: number, scenario: SimulationScenario): boolean {
    switch (spec.type) {
      case 'invoice.paid':
        return scenario.paidOnDay !== undefined && day >= scenario.paidOnDay;
      case 'customer.replied':
        return scenario.repliedOnDay !== undefined && day >= scenario.repliedOnDay;
      default:
        return false;
    }
  }

  private describe(result: { kind: string } & Record<string, unknown>): string {
    if (result.kind === 'ACTION') {
      const action = result.action as { tone?: string; channel?: string } | undefined;
      return `send ${action?.tone ?? ''} via ${action?.channel ?? 'AUTO'}`.trim();
    }
    if (result.kind === 'ESCALATE') return `escalate to ${String(result.escalateTo)}`;
    if (result.kind === 'WAIT') return `wait until ${String((result.resumeAt as Date)?.toISOString?.() ?? '')}`;
    if (result.kind === 'TERMINAL') return `closed: ${String(result.reason)}`;
    return '';
  }
}
