import { Injectable, NotFoundException } from '@nestjs/common';
import { BillingCycle, SubscriptionPlan } from '@prisma/client';
import {
  buildSubscriptionInvoicePdfHtml,
  subscriptionInvoicePdfFilename,
} from '../../common/pdf/builders/subscription-invoice.builder';
import { renderHtmlToPdfBuffer } from '../../common/pdf/html-to-pdf.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SOFTDIGIT_PLATFORM } from './subscription-lifecycle.constants';

@Injectable()
export class SubscriptionInvoiceService {
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
  }) {
    const taxPaise = args.taxPaise ?? 0;
    const totalPaise = args.amountPaise + taxPaise;
    const invoiceNumber = await this.nextInvoiceNumber();

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

  async listForCompany(companyId: string) {
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
