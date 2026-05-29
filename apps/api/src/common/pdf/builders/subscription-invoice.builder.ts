import type { BillingCycle, SubscriptionInvoice, SubscriptionPlan } from '@prisma/client';
import {
  documentPdfFilename,
  formatDocumentCurrency,
  formatDocumentDate,
} from '../document-pdf.formatters';
import {
  buildDocumentLayoutHtml,
  type DocumentLayoutViewModel,
} from '../templates/document-layout.template';

const SOFTDIGIT_COMPANY = {
  name: 'Softdigit Consulting',
  lines: [
    'Bangalore, Karnataka, India',
    'Email: office@softdigitconsulting.com',
    'GSTIN: 29XXXXX0000X1Z5',
  ],
};

function planDisplayName(plan: SubscriptionPlan): string {
  if (plan === 'PLUS') return 'Plus';
  if (plan === 'PRO') return 'Pro';
  return 'Trial';
}

function cycleDisplayName(cycle: BillingCycle): string {
  return cycle === 'YEARLY' ? 'Yearly' : 'Monthly';
}

export function buildSubscriptionInvoicePdfViewModel(
  invoice: SubscriptionInvoice & {
    company: { companyName: string; address: string | null; companyCode: string };
  },
): DocumentLayoutViewModel {
  const billingSnapshot = invoice.billingAddressSnapshot as
    | { companyName?: string; address?: string; gstNumber?: string }
    | null
    | undefined;

  const amount = invoice.amountPaise / 100;
  const tax = invoice.taxPaise / 100;
  const total = invoice.totalPaise / 100;
  const planLabel = planDisplayName(invoice.plan);
  const cycleLabel = cycleDisplayName(invoice.billingCycle);

  const partyLines: string[] = [];
  if (billingSnapshot?.address) {
    partyLines.push(...billingSnapshot.address.split(/\r?\n/).filter(Boolean));
  } else if (invoice.company.address) {
    partyLines.push(...invoice.company.address.split(/\r?\n/).filter(Boolean));
  }
  if (billingSnapshot?.gstNumber ?? invoice.gstNumber) {
    partyLines.push(`GSTIN: ${billingSnapshot?.gstNumber ?? invoice.gstNumber}`);
  }

  return {
    documentTitle: 'SUBSCRIPTION INVOICE',
    documentNumber: invoice.invoiceNumber,
    documentDate: formatDocumentDate(invoice.issuedAt),
    companyName: SOFTDIGIT_COMPANY.name,
    companyLines: SOFTDIGIT_COMPANY.lines,
    partyLabel: 'Bill To',
    partyName: billingSnapshot?.companyName ?? invoice.company.companyName,
    partyLines,
    metaRows: [
      { label: 'Plan', value: planLabel },
      { label: 'Billing', value: cycleLabel },
      { label: 'Currency', value: invoice.currency },
    ],
    lines: [
      {
        code: planLabel,
        description: `Retail IMS ${planLabel} subscription (${cycleLabel})`,
        qty: '1',
        unitPrice: formatDocumentCurrency(amount, invoice.currency),
        extra: formatDocumentCurrency(tax, invoice.currency),
        amount: formatDocumentCurrency(total, invoice.currency),
      },
    ],
    showExtraColumn: true,
    extraColumnHeader: 'Tax',
    padRowCount: 7,
    totals: [
      { label: 'Subtotal', value: formatDocumentCurrency(amount, invoice.currency) },
      { label: 'Tax', value: formatDocumentCurrency(tax, invoice.currency) },
      { label: 'Total Paid', value: formatDocumentCurrency(total, invoice.currency), bold: true },
    ],
    footerNote: 'This is a computer-generated SaaS subscription invoice from Softdigit Consulting.',
  };
}

export function buildSubscriptionInvoicePdfHtml(
  invoice: SubscriptionInvoice & {
    company: { companyName: string; address: string | null; companyCode: string };
  },
): string {
  return buildDocumentLayoutHtml(buildSubscriptionInvoicePdfViewModel(invoice));
}

export function subscriptionInvoicePdfFilename(invoiceNumber: string): string {
  return documentPdfFilename('SINV', invoiceNumber);
}
