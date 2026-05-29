import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BillingCycle, SubscriptionPlan } from '@prisma/client';
import { orderAmountPaise, type BillingInterval, type PlanId } from '../../common/plans/plan-config';
import {
  buildSubscriptionInvoicePdfHtml,
  subscriptionInvoicePdfFilename,
} from '../../common/pdf/builders/subscription-invoice.builder';
import { renderHtmlToPdfBuffer } from '../../common/pdf/html-to-pdf.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SOFTDIGIT_PLATFORM } from './subscription-lifecycle.constants';

@Injectable()
export class SubscriptionInvoiceService {
  private readonly logger = new Logger(SubscriptionInvoiceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async nextInvoiceNumber(issuedAt = new Date()): Promise<string> {
    const y = issuedAt.getFullYear();
    const m = String(issuedAt.getMonth() + 1).padStart(2, '0');
    const prefix = `SINV-${y}${m}-`;
    const last = await this.prisma.subscriptionInvoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });
    const seq = last ? Number(last.invoiceNumber.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  async createInvoice(args: {
    companyId: string;
    plan: SubscriptionPlan;
    billingCycle: BillingCycle;
    amountPaise: number;
    taxPaise?: number;
    paymentId?: string;
    billingAddress?: { companyName?: string; address?: string; gstNumber?: string };
    issuedAt?: Date;
  }) {
    const taxPaise = args.taxPaise ?? 0;
    const totalPaise = args.amountPaise + taxPaise;
    const issuedAt = args.issuedAt ?? new Date();
    const invoiceNumber = await this.nextInvoiceNumber(issuedAt);

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.subscriptionInvoice.create({
        data: {
          invoiceNumber,
          companyId: args.companyId,
          plan: args.plan,
          billingCycle: args.billingCycle,
          amountPaise: args.amountPaise,
          taxPaise,
          totalPaise,
          gstNumber: args.billingAddress?.gstNumber ?? SOFTDIGIT_PLATFORM.gstNumber,
          billingAddressSnapshot: args.billingAddress ?? undefined,
          issuedAt,
        },
      });

      if (args.paymentId) {
        await tx.subscriptionPayment.update({
          where: { id: args.paymentId },
          data: { invoiceId: invoice.id },
        });
      }

      return invoice;
    });
  }

  /** Create invoices for paid subscription payments (and legacy paid plans) missing invoice rows. */
  async backfillInvoicesForCompany(companyId: string): Promise<number> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        companyName: true,
        address: true,
        subscriptionPlan: true,
        billingCycle: true,
        paidActivatedAt: true,
        createdAt: true,
      },
    });
    if (!company) return 0;

    const billingAddress = {
      companyName: company.companyName,
      address: company.address ?? undefined,
    };

    const paymentsWithoutInvoice = await this.prisma.subscriptionPayment.findMany({
      where: {
        companyId,
        status: 'paid',
        invoiceId: null,
        plan: { in: [SubscriptionPlan.PRO, SubscriptionPlan.PLUS] },
      },
      orderBy: [{ verifiedAt: 'asc' }, { createdAt: 'asc' }],
    });

    let created = 0;
    for (const payment of paymentsWithoutInvoice) {
      const issuedAt = payment.verifiedAt ?? payment.consumedAt ?? payment.createdAt;
      await this.createInvoice({
        companyId,
        plan: payment.plan,
        billingCycle: payment.billingCycle,
        amountPaise: payment.amountPaise,
        paymentId: payment.id,
        billingAddress,
        issuedAt,
      });
      created += 1;
    }

    const isPaidPlan =
      company.subscriptionPlan === SubscriptionPlan.PRO ||
      company.subscriptionPlan === SubscriptionPlan.PLUS;

    if (created === 0 && isPaidPlan) {
      const existing = await this.prisma.subscriptionInvoice.count({ where: { companyId } });
      if (existing === 0 && company.billingCycle) {
        const planId = subscriptionPlanToPlanId(company.subscriptionPlan);
        const interval = billingCycleToInterval(company.billingCycle);
        const amountPaise = orderAmountPaise(planId, interval);
        const issuedAt = company.paidActivatedAt ?? company.createdAt;
        await this.createInvoice({
          companyId,
          plan: company.subscriptionPlan,
          billingCycle: company.billingCycle,
          amountPaise,
          billingAddress,
          issuedAt,
        });
        created += 1;
        this.logger.log(`Backfilled legacy subscription invoice for company ${companyId}`);
      }
    }

    if (created > 0) {
      this.logger.log(`Backfilled ${created} subscription invoice(s) for company ${companyId}`);
    }
    return created;
  }

  async backfillAllPaidCompanies(): Promise<{ companies: number; invoices: number }> {
    const companies = await this.prisma.company.findMany({
      where: {
        subscriptionPlan: { in: [SubscriptionPlan.PRO, SubscriptionPlan.PLUS] },
        isActive: true,
      },
      select: { id: true },
    });

    let invoices = 0;
    for (const company of companies) {
      invoices += await this.backfillInvoicesForCompany(company.id);
    }
    return { companies: companies.length, invoices };
  }

  async listForCompany(companyId: string) {
    await this.backfillInvoicesForCompany(companyId);

    return this.prisma.subscriptionInvoice.findMany({
      where: { companyId },
      orderBy: { issuedAt: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        plan: true,
        billingCycle: true,
        totalPaise: true,
        currency: true,
        issuedAt: true,
      },
    });
  }

  async getForCompany(companyId: string, invoiceId: string) {
    const invoice = await this.prisma.subscriptionInvoice.findFirst({
      where: { id: invoiceId, companyId },
      include: {
        company: { select: { companyName: true, address: true, companyCode: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async renderPdfBuffer(companyId: string, invoiceId: string): Promise<{ buffer: Buffer; filename: string }> {
    const invoice = await this.getForCompany(companyId, invoiceId);
    const html = buildSubscriptionInvoicePdfHtml(invoice);
    const buffer = await renderHtmlToPdfBuffer(html);
    return {
      buffer,
      filename: subscriptionInvoicePdfFilename(invoice.invoiceNumber),
    };
  }
}

function subscriptionPlanToPlanId(plan: SubscriptionPlan): Exclude<PlanId, 'trial'> {
  return plan === SubscriptionPlan.PLUS ? 'plus' : 'pro';
}

function billingCycleToInterval(cycle: BillingCycle): BillingInterval {
  return cycle === BillingCycle.YEARLY ? 'yearly' : 'monthly';
}
