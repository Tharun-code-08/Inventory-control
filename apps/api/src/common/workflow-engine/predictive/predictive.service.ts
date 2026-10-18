import { Injectable } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AccountFacts, churnRisk, collectionForecast, nextBestAction, paymentLikelihood } from './predictive-models';

const DAY_MS = 86_400_000;

/**
 * Predictive AI service (Plan Phase 6). Loads live account facts and runs the
 * pure {@link predictive-models} heuristics to score a single invoice or forecast
 * a whole company's collectible portfolio. Read-only and advisory.
 */
@Injectable()
export class PredictiveService {
  constructor(private readonly prisma: PrismaService) {}

  async scoreInvoice(companyId: string, invoiceId: string): Promise<{
    paymentLikelihood: number;
    churnRisk: number;
    nextBestAction: ReturnType<typeof nextBestAction>;
  } | null> {
    const invoice = await this.prisma.invoiceHeader.findFirst({
      where: { id: invoiceId, shop: { companyId } },
      select: { customerId: true, dueDate: true, totalValue: true, paidValue: true },
    });
    if (!invoice) return null;
    const facts = await this.factsFor(invoice.customerId, {
      dueDate: invoice.dueDate,
      balanceDue: Number(invoice.totalValue) - Number(invoice.paidValue),
    });
    return {
      paymentLikelihood: paymentLikelihood(facts),
      churnRisk: churnRisk(facts),
      nextBestAction: nextBestAction(facts),
    };
  }

  /** Expected recovery over all collectible invoices for a company. */
  async portfolioForecast(companyId: string) {
    const invoices = await this.prisma.invoiceHeader.findMany({
      where: {
        shop: { companyId },
        status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
      },
      select: { customerId: true, dueDate: true, totalValue: true, paidValue: true },
      take: 5000,
    });

    // Reliability per customer, in one query.
    const customerIds = [...new Set(invoices.map((i) => i.customerId))];
    const engagements = await this.prisma.recipientEngagement.findMany({
      where: { customerId: { in: customerIds } },
      select: { customerId: true, reliability: true },
    });
    const reliabilityByCustomer = new Map<string, number>();
    for (const e of engagements) {
      reliabilityByCustomer.set(e.customerId, Math.max(reliabilityByCustomer.get(e.customerId) ?? 0, e.reliability));
    }

    const accounts = invoices.map((i) => {
      const balanceDue = Number(i.totalValue) - Number(i.paidValue);
      const facts: AccountFacts = {
        reliability: reliabilityByCustomer.get(i.customerId) ?? 50,
        daysOverdue: i.dueDate ? Math.floor((Date.now() - i.dueDate.getTime()) / DAY_MS) : 0,
        balanceDue,
      };
      return { balanceDue, likelihood: paymentLikelihood(facts) };
    });

    return { invoices: accounts.length, ...collectionForecast(accounts) };
  }

  private async factsFor(
    customerId: string,
    invoice: { dueDate: Date | null; balanceDue: number },
  ): Promise<AccountFacts> {
    const rows = await this.prisma.recipientEngagement.findMany({
      where: { customerId },
      select: { reliability: true, paid: true, disputed: true, ignored: true, sent: true },
    });
    const reliability = rows.reduce((m, r) => Math.max(m, r.reliability), 0) || 50;
    const priorPaid = rows.reduce((s, r) => s + r.paid, 0);
    const priorDisputed = rows.reduce((s, r) => s + r.disputed, 0);
    const sent = rows.reduce((s, r) => s + r.sent, 0);
    const ignored = rows.reduce((s, r) => s + r.ignored, 0);
    return {
      reliability,
      daysOverdue: invoice.dueDate ? Math.floor((Date.now() - invoice.dueDate.getTime()) / DAY_MS) : 0,
      balanceDue: invoice.balanceDue,
      priorPaid,
      priorDisputed,
      ignoredRate: sent > 0 ? ignored / sent : 0,
    };
  }
}
