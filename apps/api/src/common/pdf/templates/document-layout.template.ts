import * as Handlebars from 'handlebars';
import { escapeHtml } from '../document-pdf.formatters';
import { DOCUMENT_PDF_BRAND } from '../document-pdf.types';

const BLUE = DOCUMENT_PDF_BRAND.primary;

export type DocumentLayoutLine = {
  code: string;
  description: string;
  qty: string;
  unitPrice: string;
  amount: string;
  extra?: string;
};

export type DocumentLayoutViewModel = {
  documentTitle: string;
  documentNumber: string;
  documentDate: string;
  companyName: string;
  companyLines: string[];
  partyLabel: string;
  partyName: string;
  partyLines: string[];
  metaRows: Array<{ label: string; value: string }>;
  lines: DocumentLayoutLine[];
  showExtraColumn: boolean;
  extraColumnHeader: string;
  totals: Array<{ label: string; value: string; bold?: boolean }>;
  notes?: string;
  footerNote?: string;
  padRowCount: number;
};

const DOCUMENT_LAYOUT_TEMPLATE = Handlebars.compile(`<!doctype html>
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
      padding: 14mm 16mm;
    }
    .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 16px; }
    .company .name { font-weight: 700; font-size: 11pt; margin-bottom: 4px; }
    .company p { margin: 0 0 2px; line-height: 1.35; }
    .title-block { text-align: right; min-width: 40%; }
    .doc-title { color: ${BLUE}; font-size: 22pt; font-weight: 700; margin: 0 0 8px; line-height: 1.05; }
    .meta-row { display: flex; justify-content: flex-end; gap: 20px; font-size: 10pt; }
    .meta-row span { font-weight: 700; }
    .pair { display: flex; gap: 0; margin: 10px 0; }
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
      min-height: 64px;
      padding: 8px 10px;
      line-height: 1.4;
      font-size: 10pt;
    }
    .box p { margin: 0 0 2px; }
    .meta-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .meta-table td {
      border: 1px solid #9eb4ce;
      padding: 5px 8px;
      font-size: 9.5pt;
    }
    .meta-table td:first-child { width: 28%; font-weight: 700; background: #eef3f9; }
    .lines { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .lines th {
      background: ${BLUE};
      color: #fff;
      font-size: 9pt;
      font-weight: 700;
      padding: 6px 8px;
      text-align: left;
      border: 1px solid ${BLUE};
    }
    .lines th.num, .lines td.num { text-align: right; }
    .lines td {
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      font-size: 9.5pt;
      vertical-align: top;
    }
    .lines tr.pad td { height: 22px; }
    .totals-wrap { display: flex; justify-content: flex-end; margin-top: 12px; }
    .totals { width: 42%; border-collapse: collapse; }
    .totals td { border: 1px solid #cbd5e1; padding: 5px 8px; font-size: 9.5pt; }
    .totals td:first-child { font-weight: 600; background: #f8fafc; }
    .totals td:last-child { text-align: right; }
    .totals tr.bold td { font-weight: 700; font-size: 10pt; background: #eef3f9; }
    .notes { margin-top: 14px; font-size: 9.5pt; line-height: 1.45; }
    .footer { margin-top: 18px; font-size: 9pt; color: #64748b; }
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
      <div class="meta-row">
        <div><span>No.</span> {{documentNumber}}</div>
        <div><span>Date</span> {{documentDate}}</div>
      </div>
    </div>
  </div>

  <div class="pair">
    <div class="col">
      <div class="bar">{{partyLabel}}</div>
      <div class="box">
        <p><strong>{{partyName}}</strong></p>
        {{#each partyLines}}<p>{{this}}</p>{{/each}}
      </div>
    </div>
    <div class="col">
      <div class="bar">Document Details</div>
      <div class="box">
        <table class="meta-table">
          {{#each metaRows}}
          <tr><td>{{label}}</td><td>{{value}}</td></tr>
          {{/each}}
        </table>
      </div>
    </div>
  </div>

  <table class="lines">
    <thead>
      <tr>
        <th>Code</th>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Unit Price</th>
        {{#if showExtraColumn}}<th class="num">{{extraColumnHeader}}</th>{{/if}}
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>
      {{#each lines}}
      <tr>
        <td>{{code}}</td>
        <td>{{description}}</td>
        <td class="num">{{qty}}</td>
        <td class="num">{{unitPrice}}</td>
        {{#if ../showExtraColumn}}<td class="num">{{extra}}</td>{{/if}}
        <td class="num">{{amount}}</td>
      </tr>
      {{/each}}
      {{#each padRows}}
      <tr class="pad"><td>&nbsp;</td><td></td><td></td><td></td>{{#if ../showExtraColumn}}<td></td>{{/if}}<td></td></tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals-wrap">
    <table class="totals">
      {{#each totals}}
      <tr{{#if bold}} class="bold"{{/if}}><td>{{label}}</td><td>{{value}}</td></tr>
      {{/each}}
    </table>
  </div>

  {{#if notes}}
  <div class="notes"><strong>Notes:</strong> {{notes}}</div>
  {{/if}}
  {{#if footerNote}}
  <div class="footer">{{footerNote}}</div>
  {{/if}}
</body>
</html>`);

export function buildDocumentLayoutHtml(model: DocumentLayoutViewModel): string {
  const padRows = Array.from({ length: model.padRowCount }, (_, i) => i);
  return DOCUMENT_LAYOUT_TEMPLATE({
    ...model,
    padRows,
    companyName: escapeHtml(model.companyName),
    documentTitle: escapeHtml(model.documentTitle),
    documentNumber: escapeHtml(model.documentNumber),
    documentDate: escapeHtml(model.documentDate),
    partyLabel: escapeHtml(model.partyLabel),
    partyName: escapeHtml(model.partyName),
    companyLines: model.companyLines.map(escapeHtml),
    partyLines: model.partyLines.map(escapeHtml),
    metaRows: model.metaRows.map((row) => ({
      label: escapeHtml(row.label),
      value: escapeHtml(row.value),
    })),
    lines: model.lines.map((line) => ({
      code: escapeHtml(line.code),
      description: escapeHtml(line.description),
      qty: escapeHtml(line.qty),
      unitPrice: escapeHtml(line.unitPrice),
      amount: escapeHtml(line.amount),
      extra: escapeHtml(line.extra ?? ''),
    })),
    totals: model.totals.map((row) => ({
      label: escapeHtml(row.label),
      value: escapeHtml(row.value),
      bold: row.bold,
    })),
    notes: model.notes ? escapeHtml(model.notes) : undefined,
    footerNote: model.footerNote ? escapeHtml(model.footerNote) : undefined,
    extraColumnHeader: escapeHtml(model.extraColumnHeader),
  });
}
