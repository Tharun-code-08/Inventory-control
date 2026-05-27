import { wrapBusinessEmailHtml } from './email-layout.template';

export type TemplateContext = Record<string, string | number | null | undefined>;

const TEMPLATE_TITLES: Record<string, string> = {
  rfq_invite: 'Request for Quotation',
  purchase_order_supplier: 'Purchase Order',
  sales_quotation_customer: 'Sales Quotation',
  supplier_return_notice: 'Goods Return',
  invoice_created: 'Invoice',
  payment_received: 'Payment Received',
  payment_reminder: 'Payment Reminder',
  user_invite: 'User Invitation',
  goods_receipt_posted: 'Goods Receipt Posted',
};

export function renderTemplateString(
  template: string,
  context: TemplateContext,
): string {
  return template.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_match, key: string) => {
    const value = context[key.toLowerCase()] ?? context[key];
    if (value == null || value === '') return '';
    return String(value);
  });
}

export function finalizeEmailHtml(bodyHtml: string, title: string, companyName: string): string {
  if (/^\s*<!doctype/i.test(bodyHtml) || /^\s*<html/i.test(bodyHtml)) {
    return bodyHtml;
  }
  return wrapBusinessEmailHtml({
    title,
    subtitle: companyName || undefined,
    bodyHtml,
  });
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function mergeTemplateContent(args: {
  subject: string;
  text: string;
  html: string;
  overrides?: {
    subject?: string;
    bodyText?: string;
    bodyHtml?: string;
  };
  context: TemplateContext;
  layoutTitle?: string;
  templateId?: string;
}) {
  const subjectSource = args.overrides?.subject?.trim() || args.subject;
  const textSource = args.overrides?.bodyText?.trim() || args.text;
  const htmlSource = args.overrides?.bodyHtml?.trim() || args.html;
  const layoutTitle =
    args.layoutTitle ??
    (args.templateId ? TEMPLATE_TITLES[args.templateId] : undefined) ??
    'Notification';
  const companyName = String(args.context.company_name ?? '');
  const renderedHtml = renderTemplateString(htmlSource, args.context);
  const renderedText = renderTemplateString(textSource, args.context);
  const html = finalizeEmailHtml(renderedHtml, layoutTitle, companyName);
  return {
    subject: renderTemplateString(subjectSource, args.context),
    text: renderedText || stripHtmlToText(html),
    html,
  };
}
