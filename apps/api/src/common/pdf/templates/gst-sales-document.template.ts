import * as Handlebars from 'handlebars';
import { escapeHtml } from '../document-pdf.formatters';
import { DOCUMENT_PDF_BRAND } from '../document-pdf.types';

const BLUE = DOCUMENT_PDF_BRAND.primary;

export type GstSalesDocumentLine = {
  description: string;
  hsnSac: string;
  qty: string;
  unitPrice: string;
  cgstPercent: string;
  cgstAmount: string;
  sgstPercent: string;
  sgstAmount: string;
  amount: string;
};

export type GstSalesDocumentViewModel = {
  documentTitle: string;
  documentNumber: string;
  documentDate: string;
  terms?: string;
  customerPoNumber?: string;
  placeOfSupply?: string;
  companyName: string;
  companyLines: string[];
  partyName: string;
  partyLines: string[];
  subject?: string;
  lines: GstSalesDocumentLine[];
  padRowCount: number;
  subtotal: string;
  cgstTotal: string;
  sgstTotal: string;
  cgstRateLabel: string;
  sgstRateLabel: string;
  totalDue: string;
  totalInWords: string;
  notes?: string;
  termsAndConditions?: string;
  bankDetails?: string[];
  footerNote?: string;
};

const GST_SALES_DOCUMENT_TEMPLATE = Handlebars.compile(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>{{documentTitle}} {{documentNumber}}</title>
  <style>
    @page { margin: 0; }
    * { box-sizing: border-box; }
    html, body { background: #fff; }
    body {
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 10pt;
      color: #0f172a;
      margin: 0;
      padding: 12mm 14mm;
    }
    .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 10px; }
    .company .name { font-weight: 700; font-size: 11pt; margin-bottom: 4px; }
    .company p { margin: 0 0 2px; line-height: 1.35; }
    .title-block { text-align: right; min-width: 46%; }
    .doc-title { color: ${BLUE}; font-size: 24pt; font-weight: 700; margin: 0 0 10px; line-height: 1; letter-spacing: 0.02em; }
    .doc-meta { width: 100%; border-collapse: collapse; font-size: 10pt; }
    .doc-meta td { padding: 2px 0; vertical-align: top; }
    .doc-meta td:first-child { text-align: right; padding-right: 10px; font-weight: 700; white-space: nowrap; }
    .doc-meta td:last-child { text-align: left; min-width: 120px; }
    .pair { display: flex; gap: 0; margin-top: 8px; }
    .pair .col { flex: 1; }
    .bar {
      background: ${BLUE};
      color: #fff;
      font-weight: 700;
      font-size: 9pt;
      padding: 5px 8px;
      text-transform: uppercase;
    }
    .box {
      border: 1px solid #9eb4ce;
      border-top: none;
      min-height: 72px;
      padding: 8px 10px;
      line-height: 1.4;
      font-size: 10pt;
    }
    .box p { margin: 0 0 2px; }
    .subject { margin: 10px 0 8px; font-size: 10pt; }
    .lines { width: 100%; border-collapse: collapse; margin-top: 6px; }
    .lines th {
      background: ${BLUE};
      color: #fff;
      font-size: 8.5pt;
      font-weight: 700;
      padding: 5px 6px;
      text-align: center;
      border: 1px solid ${BLUE};
    }
    .lines th.left { text-align: left; }
    .lines th.num, .lines td.num { text-align: right; }
    .lines td {
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
      font-size: 9.5pt;
      vertical-align: top;
    }
    .lines tr.pad td { height: 20px; }
    .footer-grid {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-top: 12px;
      align-items: flex-start;
    }
    .footer-left { flex: 1; font-size: 9.5pt; line-height: 1.45; }
    .footer-left p { margin: 0 0 6px; }
    .footer-left .label { font-weight: 700; }
    .totals { width: 240px; border-collapse: collapse; flex-shrink: 0; }
    .totals td {
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      font-size: 9.5pt;
    }
    .totals td:first-child { font-weight: 600; background: #f8fafc; }
    .totals td:last-child { text-align: right; }
    .totals tr.grand td { font-weight: 700; font-size: 10pt; background: #eef3f9; }
    .signature {
      margin-top: 28px;
      text-align: right;
      font-size: 9.5pt;
      color: #334155;
    }
    .signature-line {
      display: inline-block;
      min-width: 180px;
      border-top: 1px solid #94a3b8;
      padding-top: 4px;
      margin-top: 36px;
    }
    .footer-note { margin-top: 12px; font-size: 9pt; color: #64748b; }
  </style>
</head>
<body>
  <div class="top">
    <div class="company">
      <div class="name">{{companyName}}</div>
      {{#each companyLines}}<p>{{this}}</p>{{/each}}
    </div>
    <div class="title-block">
      <h1 class="doc-title">{{documentTitle}}</h1>
      <table class="doc-meta">
        <tr><td>#</td><td>{{documentNumber}}</td></tr>
        <tr><td>Date</td><td>{{documentDate}}</td></tr>
        {{#if terms}}<tr><td>Terms</td><td>{{terms}}</td></tr>{{/if}}
        {{#if customerPoNumber}}<tr><td>PO #</td><td>{{customerPoNumber}}</td></tr>{{/if}}
        {{#if placeOfSupply}}<tr><td>Place of Supply</td><td>{{placeOfSupply}}</td></tr>{{/if}}
      </table>
    </div>
  </div>

  <div class="pair">
    <div class="col">
      <div class="bar">Bill To</div>
      <div class="box">
        <p><strong>{{partyName}}</strong></p>
        {{#each partyLines}}<p>{{this}}</p>{{/each}}
      </div>
    </div>
    <div class="col"></div>
  </div>

  {{#if subject}}
  <div class="subject"><strong>Sub:</strong> {{subject}}</div>
  {{/if}}

  <table class="lines">
    <thead>
      <tr>
        <th class="left" rowspan="2">Item Description</th>
        <th rowspan="2">HSN/SAC</th>
        <th rowspan="2">Qty</th>
        <th rowspan="2">Unit Price</th>
        <th colspan="2">CGST</th>
        <th colspan="2">SGST</th>
        <th rowspan="2">Amount</th>
      </tr>
      <tr>
        <th>%</th><th>Amt</th>
        <th>%</th><th>Amt</th>
      </tr>
    </thead>
    <tbody>
      {{#each lines}}
      <tr>
        <td>{{description}}</td>
        <td class="num">{{hsnSac}}</td>
        <td class="num">{{qty}}</td>
        <td class="num">{{unitPrice}}</td>
        <td class="num">{{cgstPercent}}</td>
        <td class="num">{{cgstAmount}}</td>
        <td class="num">{{sgstPercent}}</td>
        <td class="num">{{sgstAmount}}</td>
        <td class="num">{{amount}}</td>
      </tr>
      {{/each}}
      {{#each padRows}}
      <tr class="pad"><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      {{/each}}
    </tbody>
  </table>

  <div class="footer-grid">
    <div class="footer-left">
      <p><span class="label">Total In Words</span><br />{{totalInWords}}</p>
      {{#if notes}}<p><span class="label">Notes</span><br />{{notes}}</p>{{/if}}
      {{#if termsAndConditions}}<p><span class="label">Terms &amp; Conditions</span><br />{{termsAndConditions}}</p>{{/if}}
      {{#if showBankDetails}}
      <p><span class="label">Bank Details</span></p>
      {{#each bankDetails}}<p>{{this}}</p>{{/each}}
      {{/if}}
    </div>
    <table class="totals">
      <tr><td>Sub Total</td><td>{{subtotal}}</td></tr>
      <tr><td>{{cgstRateLabel}}</td><td>{{cgstTotal}}</td></tr>
      <tr><td>{{sgstRateLabel}}</td><td>{{sgstTotal}}</td></tr>
      <tr class="grand"><td>Total Due</td><td>{{totalDue}}</td></tr>
    </table>
  </div>

  <div class="signature">
    <div class="signature-line">Authorized Signature</div>
  </div>

  {{#if footerNote}}
  <div class="footer-note">{{footerNote}}</div>
  {{/if}}
</body>
</html>`);

export function buildGstSalesDocumentHtml(model: GstSalesDocumentViewModel): string {
  const padRows = Array.from({ length: model.padRowCount }, (_, i) => i);
  return GST_SALES_DOCUMENT_TEMPLATE({
    ...model,
    padRows,
    showBankDetails: (model.bankDetails ?? []).length > 0,
    bankDetails: (model.bankDetails ?? []).map(escapeHtml),
    companyName: escapeHtml(model.companyName),
    documentTitle: escapeHtml(model.documentTitle),
    documentNumber: escapeHtml(model.documentNumber),
    documentDate: escapeHtml(model.documentDate),
    terms: model.terms ? escapeHtml(model.terms) : undefined,
    customerPoNumber: model.customerPoNumber ? escapeHtml(model.customerPoNumber) : undefined,
    placeOfSupply: model.placeOfSupply ? escapeHtml(model.placeOfSupply) : undefined,
    partyName: escapeHtml(model.partyName),
    subject: model.subject ? escapeHtml(model.subject) : undefined,
    companyLines: model.companyLines.map(escapeHtml),
    partyLines: model.partyLines.map(escapeHtml),
    lines: model.lines.map((line) => ({
      description: escapeHtml(line.description),
      hsnSac: escapeHtml(line.hsnSac),
      qty: escapeHtml(line.qty),
      unitPrice: escapeHtml(line.unitPrice),
      cgstPercent: escapeHtml(line.cgstPercent),
      cgstAmount: escapeHtml(line.cgstAmount),
      sgstPercent: escapeHtml(line.sgstPercent),
      sgstAmount: escapeHtml(line.sgstAmount),
      amount: escapeHtml(line.amount),
    })),
    subtotal: escapeHtml(model.subtotal),
    cgstTotal: escapeHtml(model.cgstTotal),
    sgstTotal: escapeHtml(model.sgstTotal),
    cgstRateLabel: escapeHtml(model.cgstRateLabel),
    sgstRateLabel: escapeHtml(model.sgstRateLabel),
    totalDue: escapeHtml(model.totalDue),
    totalInWords: escapeHtml(model.totalInWords),
    notes: model.notes ? escapeHtml(model.notes) : undefined,
    termsAndConditions: model.termsAndConditions
      ? escapeHtml(model.termsAndConditions)
      : undefined,
    footerNote: model.footerNote ? escapeHtml(model.footerNote) : undefined,
  });
}
