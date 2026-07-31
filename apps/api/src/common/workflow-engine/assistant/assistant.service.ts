import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TimelineService } from '../analytics/timeline.service';
import { PredictiveService } from '../predictive/predictive.service';
import {
  AssistantTone,
  draftMessage,
  suggestEscalation,
  summarizeTimeline,
} from './assistant-core';

const DAY_MS = 86_400_000;

/**
 * Autonomous assistant (Plan Phase 7). Produces proposals — drafts, summaries,
 * escalation suggestions — and persists them as {@link AssistantAction} rows in
 * PENDING. **Nothing executes until a human approves it**; approve/reject are the
 * gate. Uses the deterministic {@link assistant-core} + predictive scores.
 */
@Injectable()
export class AssistantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly predictive: PredictiveService,
  ) {}

  async proposeDraft(companyId: string, invoiceId: string, tone: AssistantTone, createdBy?: string) {
    const invoice = await this.loadInvoice(companyId, invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    const content = draftMessage({ tone, invoiceNumber: invoice.invoiceNumber, balanceDue: invoice.balanceDue });
    return this.create(companyId, 'DRAFT', 'invoice', invoiceId, content, `tone=${tone}`, createdBy);
  }

  async proposeSummary(companyId: string, entityType: string, entityId: string, createdBy?: string) {
    const entries = await this.timeline.forEntity(companyId, entityType, entityId);
    const content = summarizeTimeline(entries.map((e) => ({ kind: e.kind, channel: e.channel, occurredAt: e.occurredAt })));
    return this.create(companyId, 'SUMMARY', entityType, entityId, content, null, createdBy);
  }

  async proposeEscalation(companyId: string, invoiceId: string, createdBy?: string) {
    const invoice = await this.loadInvoice(companyId, invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');
    const score = await this.predictive.scoreInvoice(companyId, invoiceId);
    const remindersSent = (await this.timeline.forEntity(companyId, 'invoice', invoiceId)).filter((e) => e.kind === 'SENT').length;
    const suggestion = suggestEscalation({
      daysOverdue: invoice.daysOverdue,
      balanceDue: invoice.balanceDue,
      paymentLikelihood: score?.paymentLikelihood ?? 0.5,
      remindersSent,
    });
    const content = suggestion.suggest ? `Escalate invoice ${invoice.invoiceNumber}.` : `Hold — keep automated follow-up on ${invoice.invoiceNumber}.`;
    return this.create(companyId, 'ESCALATION_SUGGESTION', 'invoice', invoiceId, content, suggestion.reason, createdBy);
  }

  list(companyId: string, status?: string) {
    return this.prisma.assistantAction.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async approve(companyId: string, id: string, userId: string) {
    return this.decide(companyId, id, 'APPROVED', userId);
  }

  async reject(companyId: string, id: string, userId: string) {
    return this.decide(companyId, id, 'REJECTED', userId);
  }

  private async decide(companyId: string, id: string, status: 'APPROVED' | 'REJECTED', userId: string) {
    const existing = await this.prisma.assistantAction.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Assistant action not found');
    return this.prisma.assistantAction.update({
      where: { id },
      data: { status, decidedBy: userId, decidedAt: new Date() },
    });
  }

  private create(
    companyId: string,
    kind: string,
    scope: string,
    refId: string,
    content: string,
    rationale: string | null,
    createdBy?: string,
  ) {
    return this.prisma.assistantAction.create({
      data: { companyId, kind, scope, refId, content, rationale, createdBy: createdBy ?? null, status: 'PENDING' },
    });
  }

  private async loadInvoice(companyId: string, invoiceId: string) {
    const invoice = await this.prisma.invoiceHeader.findFirst({
      where: { id: invoiceId, shop: { companyId } },
      select: { invoiceNumber: true, dueDate: true, totalValue: true, paidValue: true },
    });
    if (!invoice) return null;
    return {
      invoiceNumber: invoice.invoiceNumber,
      balanceDue: Number(invoice.totalValue) - Number(invoice.paidValue),
      daysOverdue: invoice.dueDate ? Math.floor((Date.now() - invoice.dueDate.getTime()) / DAY_MS) : 0,
    };
  }
}
