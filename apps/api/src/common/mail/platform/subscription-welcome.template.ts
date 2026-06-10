import { wrapBusinessEmailHtml } from '../email-layout.template';
import {
  platformBenefitsList,
  platformCtaButton,
  platformParagraph,
  platformSupportFooter,
} from './platform-email.shared';

export type SubscriptionWelcomeContext = {
  companyName: string;
  planName: string;
  billingCycle: string;
  amountDisplay: string;
  loginUrl: string;
  invoiceNumber?: string;
};

export function subscriptionWelcomeSubject(ctx: SubscriptionWelcomeContext): string {
  return `Welcome to SoftdigitIMS ${ctx.planName} — your subscription is active`;
}

export function subscriptionWelcomeText(ctx: SubscriptionWelcomeContext): string {
  return [
    `Hi ${ctx.companyName},`,
    '',
    `Thank you for subscribing to SoftdigitIMS ${ctx.planName} (${ctx.billingCycle}).`,
    `Amount paid: ${ctx.amountDisplay}`,
    ctx.invoiceNumber ? `Invoice: ${ctx.invoiceNumber}` : '',
    '',
    'Your subscription is now active. Sign in to get started:',
    ctx.loginUrl,
    '',
    '— Softdigit Consulting',
  ]
    .filter(Boolean)
    .join('\n');
}

export function subscriptionWelcomeHtml(ctx: SubscriptionWelcomeContext): string {
  const bodyHtml = [
    platformParagraph(`Hi ${ctx.companyName},`),
    platformParagraph(
      `Thank you for subscribing to SoftdigitIMS ${ctx.planName} (${ctx.billingCycle}). Your payment of ${ctx.amountDisplay} was successful.`,
    ),
    ctx.invoiceNumber
      ? platformParagraph(`Your invoice ${ctx.invoiceNumber} is attached to this email.`)
      : '',
    platformBenefitsList([
      'Full inventory and warehouse management',
      'Purchase orders, RFQs, and supplier portal',
      'Sales orders, invoices, and payments',
      'Reports, backups, and team collaboration',
    ]),
    platformCtaButton({ label: 'Go to SoftdigitIMS', url: ctx.loginUrl }),
    platformSupportFooter(),
  ].join('');

  return wrapBusinessEmailHtml({
    brandLabel: 'Softdigit Consulting',
    title: `Welcome to ${ctx.planName}`,
    subtitle: 'Your subscription is active',
    bodyHtml,
  });
}
