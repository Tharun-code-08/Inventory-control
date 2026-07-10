"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSubscriptionInvoicePdfViewModel = buildSubscriptionInvoicePdfViewModel;
exports.buildSubscriptionInvoicePdfHtml = buildSubscriptionInvoicePdfHtml;
exports.subscriptionInvoicePdfFilename = subscriptionInvoicePdfFilename;
const document_pdf_formatters_1 = require("../document-pdf.formatters");
const document_layout_template_1 = require("../templates/document-layout.template");
const SOFTDIGIT_COMPANY = {
    name: 'Softdigit Consulting',
    lines: [
        'Bangalore, Karnataka, India',
        'Email: office@softdigitconsulting.com',
        'GSTIN: 29XXXXX0000X1Z5',
    ],
};
function planDisplayName(plan) {
    if (plan === 'PLUS')
        return 'Plus';
    if (plan === 'PRO')
        return 'Pro';
    return 'Trial';
}
function cycleDisplayName(cycle) {
    return cycle === 'YEARLY' ? 'Yearly' : 'Monthly';
}
function buildSubscriptionInvoicePdfViewModel(invoice) {
    const billingSnapshot = invoice.billingAddressSnapshot;
    const amount = invoice.amountPaise / 100;
    const tax = invoice.taxPaise / 100;
    const total = invoice.totalPaise / 100;
    const planLabel = planDisplayName(invoice.plan);
    const cycleLabel = cycleDisplayName(invoice.billingCycle);
    const partyLines = [];
    if (billingSnapshot?.address) {
        partyLines.push(...billingSnapshot.address.split(/\r?\n/).filter(Boolean));
    }
    else if (invoice.company.address) {
        partyLines.push(...invoice.company.address.split(/\r?\n/).filter(Boolean));
    }
    if (billingSnapshot?.gstNumber ?? invoice.gstNumber) {
        partyLines.push(`GSTIN: ${billingSnapshot?.gstNumber ?? invoice.gstNumber}`);
    }
    return {
        documentTitle: 'SUBSCRIPTION INVOICE',
        documentNumber: invoice.invoiceNumber,
        documentDate: (0, document_pdf_formatters_1.formatDocumentDate)(invoice.issuedAt),
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
                description: `SoftdigitIMS ${planLabel} subscription (${cycleLabel})`,
                qty: '1',
                unitPrice: (0, document_pdf_formatters_1.formatDocumentCurrency)(amount, invoice.currency),
                extra: (0, document_pdf_formatters_1.formatDocumentCurrency)(tax, invoice.currency),
                amount: (0, document_pdf_formatters_1.formatDocumentCurrency)(total, invoice.currency),
            },
        ],
        showExtraColumn: true,
        extraColumnHeader: 'Tax',
        padRowCount: 7,
        totals: [
            { label: 'Subtotal', value: (0, document_pdf_formatters_1.formatDocumentCurrency)(amount, invoice.currency) },
            { label: 'Tax', value: (0, document_pdf_formatters_1.formatDocumentCurrency)(tax, invoice.currency) },
            { label: 'Total Paid', value: (0, document_pdf_formatters_1.formatDocumentCurrency)(total, invoice.currency), bold: true },
        ],
        footerNote: 'This is a computer-generated SaaS subscription invoice from Softdigit Consulting.',
    };
}
function buildSubscriptionInvoicePdfHtml(invoice) {
    return (0, document_layout_template_1.buildDocumentLayoutHtml)(buildSubscriptionInvoicePdfViewModel(invoice));
}
function subscriptionInvoicePdfFilename(invoiceNumber) {
    return (0, document_pdf_formatters_1.documentPdfFilename)('SINV', invoiceNumber);
}
//# sourceMappingURL=subscription-invoice.builder.js.map