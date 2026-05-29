import { Injectable, Logger } from '@nestjs/common';
import { BillingCycle, SubscriptionPlan } from '@prisma/client';
import { buildSubscriptionInvoicePdfHtml } from '../../common/pdf/builders/subscription-invoice.builder';
import { renderHtmlToPdfBuffer } from '../../common/pdf/html-to-pdf.service';
import { getTrialDays } from '../../common/plans/plan-config';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformLifecycleMailService } from './platform-lifecycle-mail.service';
import { SubscriptionInvoiceService } from './subscription-invoice.service';

function planLabel(plan: SubscriptionPlan): string {
  if (plan === 'PLUS') return 'Plus';
  if (plan === 'PRO') return 'Pro';
  return 'Trial';
}

function cycleLabel(cycle: BillingCycle): string {
  return cycle === 'YEARLY' ? 'Yearly' : 'Monthly';
}

function formatInr(paise: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
}

@Injectable()
export class LifecycleOrchestratorService {
  private readonly logger = new Logger(LifecycleOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoices: SubscriptionInvoiceService,
    private readonly mail: PlatformLifecycleMailService,
  ) {}

  async onTrialStarted(args: { companyId: string; ownerEmail: string; companyName: string }) {
    const company = await this.prisma.company.findUnique({
      where: { id: args.companyId },
      select: { trialEndsAt: true, platformMarketingOptOut: true },
    });
    if (!company) return;

    const trialEndsAt = company.trialEndsAt?.toLocaleDateString('en-IN') ?? '';

    await this.mail.sendCampaignEmail({
      companyId: args.companyId,
      companyName: args.companyName,
      recipient: args.ownerEmail,
      campaignKey: 'platform_trial_welcome',
      marketingOptOut: company.platformMarketingOptOut,
      context: { trialEndsAt },
    });

    this.logger.log(`Trial welcome queued for company ${args.companyId}`);
  }

  async onSubscriptionActivated(args: {
    companyId: string;
    ownerEmail: string;
    companyName: string;
    plan: SubscriptionPlan;
    billingCycle: BillingCycle;
    amountPaise: number;
    paymentId?: string;
  }) {
    const company = await this.prisma.company.findUnique({
      where: { id: args.companyId },
      select: { address: true, companyName: true, platformMarketingOptOut: true },
    });
    if (!company) return;

    await this.prisma.company.update({
      where: { id: args.companyId },
      data: { paidActivatedAt: new Date() },
    });

    const invoice = await this.invoices.createInvoice({
      companyId: args.companyId,
      plan: args.plan,
      billingCycle: args.billingCycle,
      amountPaise: args.amountPaise,
      paymentId: args.paymentId,
      billingAddress: {
        companyName: company.companyName,
        address: company.address ?? undefined,
      },
    });

    const fullInvoice = await this.invoices.getForCompany(args.companyId, invoice.id);
    const html = buildSubscriptionInvoicePdfHtml(fullInvoice);
    const pdfBuffer = await renderHtmlToPdfBuffer(html);

    await this.mail.sendSubscriptionWelcome({
      companyId: args.companyId,
      companyName: args.companyName,
      recipient: args.ownerEmail,
      planName: planLabel(args.plan),
      billingCycle: cycleLabel(args.billingCycle),
      amountDisplay: formatInr(args.amountPaise),
      invoiceNumber: invoice.invoiceNumber,
      invoicePdf: pdfBuffer,
    });

    this.logger.log(`Subscription activated lifecycle for company ${args.companyId}`);
  }

  async onPaymentFailed(args: {
    companyId: string;
    ownerEmail: string;
    companyName: string;
    paymentId: string;
    failureReason?: string;
    renewalAttempt: number;
  }) {
    await this.prisma.subscriptionPayment.update({
      where: { id: args.paymentId },
      data: {
        status: 'failed',
        failureReason: args.failureReason,
        renewalAttempt: args.renewalAttempt,
      },
    });

    const campaignKeys = ['dunning_immediate', 'dunning_1d', 'dunning_3d', 'dunning_7d', 'dunning_14d'] as const;
    const key = campaignKeys[Math.min(args.renewalAttempt, campaignKeys.length - 1)];

    if (args.renewalAttempt >= 3) {
      await this.prisma.company.update({
        where: { id: args.companyId },
        data: { subscriptionStatus: args.renewalAttempt >= 4 ? 'EXPIRED' : 'SUSPENDED' },
      });
    }

    await this.mail.sendCampaignEmail({
      companyId: args.companyId,
      companyName: args.companyName,
      recipient: args.ownerEmail,
      campaignKey: key,
    });
  }

  async onTrialExpired(args: { companyId: string; ownerEmail: string; companyName: string }) {
    await this.prisma.company.update({
      where: { id: args.companyId },
      data: { subscriptionStatus: 'EXPIRED' },
    });

    await this.mail.sendCampaignEmail({
      companyId: args.companyId,
      companyName: args.companyName,
      recipient: args.ownerEmail,
      campaignKey: 'trial_expired_day_0',
      context: { trialDays: getTrialDays() },
    });
  }

  async resolveOwnerEmail(companyId: string): Promise<{ email: string; companyName: string } | null> {
    const owner = await this.prisma.user.findFirst({
      where: {
        shop: { companyId },
        role: { name: 'OWNER' },
        isActive: true,
        deletedAt: null,
      },
      select: { email: true, shop: { select: { company: { select: { companyName: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    if (!owner?.email) return null;
    return {
      email: owner.email,
      companyName: owner.shop?.company?.companyName ?? 'there',
    };
  }
}
