import * as Handlebars from 'handlebars';
import * as puppeteer from 'puppeteer';

const BLUE = '#366092';
const BLUE_LIGHT = '#DCE6F1';

export type PurchaseOrderPdfLine = {
  code: string;
  description: string;
  qty: string;
  unitPrice: string;
  total: string;
};

export type PurchaseOrderPdfData = {
  poNumber: string;
  poDate: string;
  buyerName: string;
  buyerLines: string[];
  supplierTitle: string;
  supplierLines: string[];
  deliveryLines: string[];
  deliveryDate: string;
  paymentTerms: string;
  requestedBy: string;
  department: string;
  lines: PurchaseOrderPdfLine[];
  /** Count of blank rows to pad the items table (min 12 lines). */
  padRowCount: number;
  specialInstructions: string;
  totalNet: string;
  delivery: string;
  vat: string;
  grandTotal: string;
};

const PO_INVOICE_TEMPLATE = Handlebars.compile(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Purchase Order {{poNumber}}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 10pt;
      color: #000;
      margin: 0;
      padding: 14mm 16mm;
    }
    .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .buyer .name { font-weight: 700; font-size: 11pt; margin-bottom: 4px; }
    .buyer p { margin: 0 0 2px; line-height: 1.35; }
    .title-block { text-align: right; min-width: 42%; }
    .po-title { color: ${BLUE}; font-size: 26pt; font-weight: 700; letter-spacing: 0.5px; margin: 0 0 8px; line-height: 1; }
    .meta-row { display: flex; justify-content: flex-end; gap: 24px; font-size: 10pt; }
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
      min-height: 72px;
      padding: 8px 10px;
      line-height: 1.4;
      font-size: 10pt;
    }
    .box p { margin: 0 0 2px; }
    .meta-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .meta-table th {
      background: ${BLUE};
      color: #fff;
      font-weight: 700;
      font-size: 9pt;
      padding: 5px 8px;
      border: 1px solid ${BLUE};
      text-align: left;
    }
    .meta-table td {
      border: 1px solid #9eb4ce;
      padding: 6px 8px;
      min-height: 22px;
      vertical-align: top;
      font-size: 10pt;
    }
    .items { width: 100%; border-collapse: collapse; margin-top: 4px; }
    .items th {
      background: ${BLUE_LIGHT};
      color: #000;
      font-weight: 700;
      font-size: 9pt;
      padding: 5px 6px;
      border: 1px solid #9eb4ce;
      text-align: left;
    }
    .items th.num { text-align: right; }
    .items td {
      border: 1px solid #c5d4e4;
      padding: 5px 6px;
      height: 20px;
      vertical-align: top;
      font-size: 10pt;
    }
    .items td.num { text-align: right; }
    .footer { display: flex; gap: 12px; margin-top: 12px; align-items: flex-start; }
    .instructions { flex: 1.2; }
    .instructions .bar { margin-bottom: 0; }
    .instructions .box { min-height: 88px; white-space: pre-wrap; }
    .totals { flex: 0.85; }
    .totals table { width: 100%; border-collapse: collapse; }
    .totals td {
      border: 1px solid #9eb4ce;
      padding: 5px 8px;
      font-size: 10pt;
    }
    .totals td.label { font-weight: 700; width: 55%; }
    .totals td.amount { text-align: right; }
    .totals tr.grand td {
      background: ${BLUE_LIGHT};
      font-weight: 700;
      font-size: 11pt;
    }
    .authorised { margin-top: 10px; }
    .authorised .bar { display: inline-block; min-width: 120px; }
    .authorised .sig { border: 1px solid #9eb4ce; border-top: none; height: 48px; width: 200px; }
  </style>
</head>
<body>
  <div class="top">
    <div class="buyer">
      <div class="name">{{buyerName}}</div>
      {{#each buyerLines}}<p>{{this}}</p>{{/each}}
    </div>
    <div class="title-block">
      <h1 class="po-title">PURCHASE ORDER</h1>
      <div class="meta-row">
        <div><span>Date:</span> {{poDate}}</div>
        <div><span>PO No.:</span> {{poNumber}}</div>
      </div>
    </div>
  </div>

  <div class="pair">
    <div class="col">
      <div class="bar">Supplier</div>
      <div class="box">
        <p><strong>{{supplierTitle}}</strong></p>
        {{#each supplierLines}}<p>{{this}}</p>{{/each}}
      </div>
    </div>
    <div class="col">
      <div class="bar">Delivery Address</div>
      <div class="box">
        {{#each deliveryLines}}<p>{{this}}</p>{{/each}}
      </div>
    </div>
  </div>

  <table class="meta-table">
    <tr>
      <th>Delivery Date</th>
      <th>Payment Terms</th>
      <th>Requested By</th>
      <th>Department</th>
    </tr>
    <tr>
      <td>{{deliveryDate}}</td>
      <td>{{paymentTerms}}</td>
      <td>{{requestedBy}}</td>
      <td>{{department}}</td>
    </tr>
  </table>

  <table class="items">
    <thead>
      <tr>
        <th style="width:14%">ITEM</th>
        <th style="width:40%">DESCRIPTION</th>
        <th class="num" style="width:10%">QTY</th>
        <th class="num" style="width:18%">UNIT PRICE</th>
        <th class="num" style="width:18%">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      {{#each lines}}
      <tr>
        <td>{{code}}</td>
        <td>{{description}}</td>
        <td class="num">{{qty}}</td>
        <td class="num">{{unitPrice}}</td>
        <td class="num">{{total}}</td>
      </tr>
      {{/each}}
      {{#each padRows}}
      <tr>
        <td>&nbsp;</td><td></td><td></td><td></td><td></td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="footer">
    <div class="instructions">
      <div class="bar">Special Instructions</div>
      <div class="box">{{specialInstructions}}</div>
      <div class="authorised">
        <div class="bar">Authorised</div>
        <div class="sig"></div>
      </div>
    </div>
    <div class="totals">
      <table>
        <tr><td class="label">TOTAL NET</td><td class="amount">{{totalNet}}</td></tr>
        <tr><td class="label">DELIVERY</td><td class="amount">{{delivery}}</td></tr>
        <tr><td class="label">VAT</td><td class="amount">{{vat}}</td></tr>
        <tr class="grand"><td class="label">TOTAL</td><td class="amount">{{grandTotal}}</td></tr>
      </table>
    </div>
  </div>
</body>
</html>`);

export function formatPoPdfDate(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

export function formatPoPdfMoney(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function buildPurchaseOrderPrintHtml(data: PurchaseOrderPdfData): string {
  return PO_INVOICE_TEMPLATE({
    ...data,
    padRows: Array.from({ length: data.padRowCount }, () => ({})),
  });
}

export async function renderPurchaseOrderPdfBuffer(data: PurchaseOrderPdfData): Promise<Buffer> {
  const html = buildPurchaseOrderPrintHtml(data);
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    ...(executablePath ? { executablePath } : {}),
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
      timeout: 30_000,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export function purchaseOrderPdfFilename(poNumber: string): string {
  const safe = poNumber.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_') || 'purchase-order';
  return `${safe}.pdf`;
}
