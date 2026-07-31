import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ActionSpec } from '../graph/graph-types';
import { AssistantService } from '../assistant/assistant.service';
import { DocumentPdfService } from '@/common/pdf/document-pdf.service';

/**
 * Pluggable Action registry (Plan §1 "Actions", §5). An Action is a unit of work
 * a workflow node performs; ACTION nodes reference one by `type`. Notifications
 * are just one Action — Webhook / CRM / PDF / Approval / AI-Summary register the
 * same way, which is how the engine grows into a general automation platform
 * without being modified.
 */
export interface ActionContext {
  readonly companyId: string;
  readonly customerId?: string;
  readonly invoiceId?: string;
  readonly invoiceNumber?: string;
  readonly balanceDue?: number;
  readonly tone?: string;
  readonly correlationId?: string;
  readonly nodeKey?: string;
}

export interface ActionResult {
  readonly performed: boolean;
  readonly detail: string;
  readonly providerRef?: string | null;
}

export interface WorkflowAction {
  readonly type: string;
  execute(ctx: ActionContext, params?: Readonly<Record<string, unknown>>): Promise<ActionResult>;
}

const HTTP_TIMEOUT_MS = 5_000;

/** Real outbound webhook action (Plan §1 Actions: Webhook). */
export class WebhookAction implements WorkflowAction {
  readonly type = 'webhook';
  private readonly logger = new Logger(WebhookAction.name);

  async execute(ctx: ActionContext, params?: Readonly<Record<string, unknown>>): Promise<ActionResult> {
    const url = typeof params?.url === 'string' ? params.url : '';
    if (!url) return { performed: false, detail: 'webhook: no url configured' };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'content-type': 'application/json', ...(asHeaders(params?.headers)) },
        body: JSON.stringify({ event: 'workflow.action', context: ctx }),
      });
      if (!res.ok) return { performed: false, detail: `webhook: HTTP ${res.status}` };
      return { performed: true, detail: `webhook: delivered (HTTP ${res.status})` };
    } catch (err) {
      this.logger.warn(`webhook to ${url} failed: ${(err as Error).message}`);
      return { performed: false, detail: `webhook: ${(err as Error).message}` };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Marker action: customer notification is executed by the dispatch pipeline. */
class NotifyMarkerAction implements WorkflowAction {
  constructor(readonly type: string) {}
  async execute(): Promise<ActionResult> {
    return { performed: true, detail: `${this.type}: routed via dispatch pipeline` };
  }
}

/** Human-approval gate: signals the executor to park the thread (Plan §7 Phase 7). */
class ApprovalAction implements WorkflowAction {
  readonly type = 'approval';
  async execute(): Promise<ActionResult> {
    return { performed: true, detail: 'approval: awaiting human decision' };
  }
}

/** Deferred integrations — registered so graphs referencing them are valid. */
class DeferredAction implements WorkflowAction {
  constructor(readonly type: string) {}
  async execute(): Promise<ActionResult> {
    return { performed: false, detail: `${this.type}: integration not yet implemented (deferred)` };
  }
}

function asHeaders(v: unknown): Record<string, string> {
  if (v && typeof v === 'object') {
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof val === 'string') out[k] = val;
    }
    return out;
  }
  return {};
}

/** Real AI-summary action: creates an assistant summary proposal (pending approval). */
class AiSummaryAction implements WorkflowAction {
  readonly type = 'ai.summary';
  constructor(private readonly assistant: AssistantService) {}
  async execute(ctx: ActionContext): Promise<ActionResult> {
    if (!ctx.invoiceId) return { performed: false, detail: 'ai.summary: no entity to summarise' };
    await this.assistant.proposeSummary(ctx.companyId, 'invoice', ctx.invoiceId);
    return { performed: true, detail: 'ai.summary: summary proposed (pending human approval)' };
  }
}

/** Real PDF action: renders the invoice PDF via the document PDF platform. */
class PdfGenerateAction implements WorkflowAction {
  readonly type = 'pdf.generate';
  private readonly logger = new Logger(PdfGenerateAction.name);
  constructor(private readonly pdf: DocumentPdfService) {}
  async execute(ctx: ActionContext): Promise<ActionResult> {
    if (!ctx.invoiceId) return { performed: false, detail: 'pdf.generate: no invoice to render' };
    try {
      const result = await this.pdf.renderInvoicePdfById(ctx.invoiceId);
      return { performed: true, detail: `pdf.generate: rendered ${result.filename}` };
    } catch (err) {
      this.logger.warn(`pdf.generate failed for ${ctx.invoiceId}: ${(err as Error).message}`);
      return { performed: false, detail: `pdf.generate: ${(err as Error).message}` };
    }
  }
}

/** Real CRM action: appends to the in-ERP customer activity log. */
class CrmUpdateAction implements WorkflowAction {
  readonly type = 'crm.update';
  constructor(private readonly prisma: PrismaService) {}
  async execute(ctx: ActionContext, params?: Readonly<Record<string, unknown>>): Promise<ActionResult> {
    if (!ctx.customerId) return { performed: false, detail: 'crm.update: no customer in context' };
    const note =
      typeof params?.note === 'string'
        ? params.note
        : `Dunning ${ctx.tone ?? 'contact'}${ctx.invoiceNumber ? ` for ${ctx.invoiceNumber}` : ''}`;
    await this.prisma.customerActivity.create({
      data: {
        companyId: ctx.companyId,
        customerId: ctx.customerId,
        type: typeof params?.type === 'string' ? params.type : 'dunning-contact',
        note,
        refType: ctx.invoiceId ? 'invoice' : null,
        refId: ctx.invoiceId ?? null,
      },
    });
    return { performed: true, detail: 'crm.update: customer activity logged' };
  }
}

@Injectable()
export class ActionRegistry {
  private readonly actions = new Map<string, WorkflowAction>();

  constructor(
    @Optional() assistant?: AssistantService,
    @Optional() pdf?: DocumentPdfService,
    @Optional() prisma?: PrismaService,
  ) {
    for (const a of [
      new WebhookAction(),
      new NotifyMarkerAction('notify.customer'),
      new NotifyMarkerAction('notify.in-app'),
      new ApprovalAction(),
      prisma ? new CrmUpdateAction(prisma) : new DeferredAction('crm.update'),
      pdf ? new PdfGenerateAction(pdf) : new DeferredAction('pdf.generate'),
      assistant ? new AiSummaryAction(assistant) : new DeferredAction('ai.summary'),
    ]) {
      this.register(a);
    }
  }

  register(action: WorkflowAction): void {
    this.actions.set(action.type, action);
  }

  has(type: string): boolean {
    return this.actions.has(type);
  }

  /** Execute a spec's action; an unregistered type is a safe no-op. */
  async execute(spec: ActionSpec, ctx: ActionContext): Promise<ActionResult> {
    const action = this.actions.get(spec.type);
    if (!action) return { performed: false, detail: `no action registered for "${spec.type}"` };
    return action.execute(ctx, spec.params);
  }
}
