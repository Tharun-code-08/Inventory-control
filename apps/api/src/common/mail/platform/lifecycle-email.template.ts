import { wrapBusinessEmailHtml } from '../email-layout.template';
import {
  platformBenefitsList,
  platformCtaButton,
  platformParagraph,
  platformSupportFooter,
  type PlatformEmailCta,
} from './platform-email.shared';

export type LifecycleEmailContent = {
  title: string;
  subtitle?: string;
  greeting: string;
  paragraphs: string[];
  bullets?: string[];
  cta?: PlatformEmailCta;
  secondaryCta?: PlatformEmailCta;
  unsubscribeUrl?: string;
  transactional?: boolean;
};

export function lifecycleEmailSubject(title: string, companyName?: string): string {
  return companyName ? `${title} — ${companyName}` : title;
}

export function lifecycleEmailText(content: LifecycleEmailContent): string {
  const lines = [content.greeting, '', ...content.paragraphs];
  if (content.bullets?.length) {
    lines.push('', ...content.bullets.map((b) => `• ${b}`));
  }
  if (content.cta) {
    lines.push('', content.cta.label, content.cta.url);
  }
  lines.push('', '— Softdigit Consulting');
  return lines.join('\n');
}

export function lifecycleEmailHtml(content: LifecycleEmailContent): string {
  const bodyHtml = [
    platformParagraph(content.greeting),
    ...content.paragraphs.map((p) => platformParagraph(p)),
    content.bullets?.length ? platformBenefitsList(content.bullets) : '',
    content.cta ? platformCtaButton(content.cta) : '',
    content.secondaryCta ? platformCtaButton(content.secondaryCta) : '',
    platformSupportFooter(content.transactional ? undefined : content.unsubscribeUrl),
  ].join('');

  return wrapBusinessEmailHtml({
    brandLabel: 'Softdigit Consulting',
    title: content.title,
    subtitle: content.subtitle,
    bodyHtml,
  });
}
