import { wrapBusinessEmailHtml } from '../email-layout.template';
import {
  platformBenefitsList,
  platformCtaButton,
  platformParagraph,
  platformSupportFooter,
} from './platform-email.shared';

export type TrialWelcomeContext = {
  companyName: string;
  trialDays: number;
  trialEndsAt: string;
  loginUrl: string;
  upgradeUrl: string;
  unsubscribeUrl?: string;
};

export function trialWelcomeSubject(ctx: TrialWelcomeContext): string {
  return `Welcome to Retail IMS — your ${ctx.trialDays}-day trial starts now`;
}

export function trialWelcomeText(ctx: TrialWelcomeContext): string {
  return [
    `Hi ${ctx.companyName},`,
    '',
    `Your Retail IMS trial is active for ${ctx.trialDays} days (ends ${ctx.trialEndsAt}).`,
    '',
    'Sign in:',
    ctx.loginUrl,
    '',
    'Upgrade anytime:',
    ctx.upgradeUrl,
    '',
    '— Softdigit Consulting',
  ].join('\n');
}

export function trialWelcomeHtml(ctx: TrialWelcomeContext): string {
  const bodyHtml = [
    platformParagraph(`Hi ${ctx.companyName},`),
    platformParagraph(
      `Welcome to Retail IMS! Your free trial is active for ${ctx.trialDays} days and ends on ${ctx.trialEndsAt}.`,
    ),
    platformBenefitsList([
      'Set up products and track stock across warehouses',
      'Create purchase orders and receive goods',
      'Run sales orders and issue invoices',
      'Invite your team and explore reports',
    ]),
    platformCtaButton({ label: 'Start using Retail IMS', url: ctx.loginUrl }),
    platformParagraph('Ready to commit? Upgrade anytime from your billing settings.'),
    platformCtaButton({ label: 'View plans', url: ctx.upgradeUrl }),
    platformSupportFooter(ctx.unsubscribeUrl),
  ].join('');

  return wrapBusinessEmailHtml({
    brandLabel: 'Softdigit Consulting',
    title: 'Your trial has started',
    subtitle: `${ctx.trialDays} days of full access`,
    bodyHtml,
  });
}
