/**
 * Pipeline stage abstraction (Plan §4). A Stage is `evaluate(context) → context`;
 * the runner threads a context through an ordered list of stages, short-circuiting
 * once a stage marks the decision suppressed. Stages are registered, not
 * hard-coded branches — new stages slot in without touching the runner.
 */
import { PipelineContext } from './pipeline-context';

export interface PipelineStage {
  readonly name: string;
  evaluate(ctx: PipelineContext): PipelineContext;
}

export class NotificationPipeline {
  constructor(private readonly stages: readonly PipelineStage[]) {}

  /** Names of the stages, in run order (for introspection / decision logs). */
  get stageNames(): string[] {
    return this.stages.map((s) => s.name);
  }

  run(ctx: PipelineContext): PipelineContext {
    let current = ctx;
    for (const stage of this.stages) {
      // Once suppressed, later stages are skipped — the decision is final.
      if (current.decision.suppressed) break;
      current = stage.evaluate(current);
    }
    return current;
  }
}
