/**
 * Generate invoice-small.pdf from fixture
 *
 * Narrow focus: Build trustworthy PDF for review
 * - Load fixture
 * - Render to HTML
 * - Convert to PDF
 * - Output for three-voice review
 *
 * Run: npx ts-node generate-invoice-small.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface InvoiceFixture {
  name: string;
  purpose: string;
  invoice: {
    invoiceType: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    status: string;
    currency: string;
    company: {
      name: string;
      address: string;
      gstin: string;
      phone: string;
      email: string;
    };
    customer: {
      name: string;
      address: string;
      gstin: string;
      phone: string;
      email: string;
    };
    supplyDetails: {
      placeOfSupply: string;
      reverseChargeApplicable: boolean;
    };
    lineItems: Array<{
      slNo: number;
      sku: string;
      description: string;
      hsnCode: string;
      quantity: number;
      uom: string;
      unitPrice: number;
      baseAmount: number;
      discountAmount: number;
      taxableAmount: number;
      taxRate: number;
      cgstRate: number;
      cgstAmount: number;
      sgstRate: number;
      sgstAmount: number;
      igstRate: number;
      igstAmount: number;
      grossAmount: number;
    }>;
    summary: {
      subtotal: number;
      discountAmount: number;
      taxableAmount: number;
      cgstAmount: number;
      sgstAmount: number;
      igstAmount: number;
      totalTax: number;
      grossTotal: number;
    };
    termsAndConditions: string[];
    authorizedSignatory: {
      name: string;
      designation: string;
    };
    bankDetails: {
      accountNumber: string;
      ifscCode: string;
      branch: string;
    };
  };
}

/**
 * Render invoice to HTML for PDF conversion
 * Focus: Professional, conservative, trustworthy
 */
function renderInvoiceHtml(invoice: InvoiceFixture['invoice']): string {
  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #333;
      line-height: 1.5;
      background: white;
    }
    .invoice {
      max-width: 8.5in;
      height: 11in;
      margin: 0 auto;
      padding: 30px;
      background: white;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 20px;
    }
    .company-name {
      font-size: 18px;
      font-weight: bold;
      color: #1a1a1a;
    }
    .company-details {
      font-size: 11px;
      color: #666;
      line-height: 1.6;
      margin-top: 5px;
    }
    .invoice-meta {
      text-align: right;
      font-size: 11px;
    }
    .invoice-number {
      font-size: 14px;
      font-weight: bold;
      color: #1a1a1a;
    }
    .status-badge {
      display: inline-block;
      margin-top: 5px;
      padding: 2px 8px;
      background: #4CAF50;
      color: white;
      border-radius: 3px;
      font-size: 10px;
      font-weight: bold;
    }

    /* Customer Info */
    .customer-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      font-size: 11px;
    }
    .customer-block {
      flex: 1;
    }
    .customer-block h3 {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 5px;
      color: #666;
      text-transform: uppercase;
    }
    .customer-block p {
      color: #333;
      margin-bottom: 3px;
      line-height: 1.5;
    }
    .gstin {
      font-weight: bold;
      margin-top: 5px;
      color: #1a1a1a;
    }

    /* Table */
    .table-section {
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th {
      background: #f5f5f5;
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
      font-weight: bold;
      color: #333;
      font-size: 10px;
    }
    td {
      border: 1px solid #ddd;
      padding: 8px;
      color: #333;
    }
    td.number {
      text-align: right;
    }
    tr:nth-child(even) {
      background: #fafafa;
    }

    /* Totals */
    .totals-section {
      margin-bottom: 20px;
      display: flex;
      justify-content: flex-end;
    }
    .totals-box {
      width: 280px;
      border: 1px solid #ddd;
      font-size: 11px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid #ddd;
    }
    .total-row:last-child {
      border-bottom: none;
    }
    .total-label {
      font-weight: normal;
      color: #666;
    }
    .total-amount {
      text-align: right;
      font-weight: normal;
    }
    .grand-total {
      background: #f5f5f5;
      padding: 10px 12px !important;
      font-weight: bold;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
    }
    .grand-total .total-label {
      font-weight: bold;
      color: #1a1a1a;
    }
    .grand-total .total-amount {
      font-weight: bold;
      color: #1a1a1a;
      font-size: 13px;
    }

    /* Tax Summary */
    .tax-summary {
      background: #f9f9f9;
      border: 1px solid #ddd;
      padding: 10px 12px;
      margin-bottom: 15px;
      font-size: 10px;
    }
    .tax-summary h4 {
      font-size: 10px;
      font-weight: bold;
      margin-bottom: 5px;
      color: #333;
    }
    .tax-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }

    /* Footer */
    .footer {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
      font-size: 10px;
    }
    .footer-section {
      flex: 1;
    }
    .footer-section h4 {
      font-size: 10px;
      font-weight: bold;
      margin-bottom: 5px;
      color: #666;
    }
    .footer-section p {
      font-size: 9px;
      color: #333;
      margin-bottom: 2px;
    }

    /* Print */
    @media print {
      body { margin: 0; padding: 0; }
      .invoice { margin: 0; max-width: none; height: auto; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="company-name">${invoice.company.name}</div>
        <div class="company-details">
          <div>${invoice.company.address}</div>
          <div>GSTIN: ${invoice.company.gstin}</div>
          <div>Phone: ${invoice.company.phone}</div>
          <div>Email: ${invoice.company.email}</div>
        </div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-number">${invoice.invoiceNumber}</div>
        <div class="status-badge">${invoice.status}</div>
        <div style="margin-top: 10px;">
          <div><strong>Invoice Date:</strong> ${formatDate(invoice.invoiceDate)}</div>
          <div><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</div>
          <div><strong>Type:</strong> ${invoice.invoiceType}</div>
        </div>
      </div>
    </div>

    <!-- Customer Info -->
    <div class="customer-section">
      <div class="customer-block">
        <h3>Bill To</h3>
        <p><strong>${invoice.customer.name}</strong></p>
        <p>${invoice.customer.address}</p>
        <p class="gstin">GSTIN: ${invoice.customer.gstin}</p>
        <p>Phone: ${invoice.customer.phone}</p>
      </div>
      <div class="customer-block">
        <h3>Place of Supply</h3>
        <p>${invoice.supplyDetails.placeOfSupply}</p>
        <h3 style="margin-top: 10px;">Reverse Charge</h3>
        <p>${invoice.supplyDetails.reverseChargeApplicable ? 'Yes' : 'No'}</p>
      </div>
    </div>

    <!-- Items Table -->
    <div class="table-section">
      <table>
        <thead>
          <tr>
            <th style="width: 5%;">S.No</th>
            <th style="width: 12%;">SKU</th>
            <th style="width: 28%;">Description</th>
            <th style="width: 8%;">HSN</th>
            <th style="width: 8%;">Qty</th>
            <th style="width: 12%;">Unit Price</th>
            <th style="width: 12%;">Taxable</th>
            <th style="width: 15%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.lineItems
            .map(
              item => `
            <tr>
              <td>${item.slNo}</td>
              <td>${item.sku}</td>
              <td>${item.description}</td>
              <td>${item.hsnCode}</td>
              <td class="number">${item.quantity} ${item.uom}</td>
              <td class="number">${formatCurrency(item.unitPrice)}</td>
              <td class="number">${formatCurrency(item.taxableAmount)}</td>
              <td class="number"><strong>${formatCurrency(item.grossAmount)}</strong></td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- Tax Summary -->
    <div class="tax-summary">
      <h4>Tax Breakdown</h4>
      <div class="tax-item">
        <span>CGST (${invoice.lineItems[0]?.cgstRate}%)</span>
        <span class="number"><strong>${formatCurrency(invoice.summary.cgstAmount)}</strong></span>
      </div>
      <div class="tax-item">
        <span>SGST (${invoice.lineItems[0]?.sgstRate}%)</span>
        <span class="number"><strong>${formatCurrency(invoice.summary.sgstAmount)}</strong></span>
      </div>
      ${invoice.summary.igstAmount > 0
        ? `
      <div class="tax-item">
        <span>IGST</span>
        <span class="number"><strong>${formatCurrency(invoice.summary.igstAmount)}</strong></span>
      </div>
      `
        : ''}
    </div>

    <!-- Totals -->
    <div class="totals-section">
      <div class="totals-box">
        <div class="total-row">
          <span class="total-label">Subtotal</span>
          <span class="total-amount">${formatCurrency(invoice.summary.subtotal)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Discount</span>
          <span class="total-amount">-${formatCurrency(invoice.summary.discountAmount)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Taxable Amount</span>
          <span class="total-amount">${formatCurrency(invoice.summary.taxableAmount)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Total Tax</span>
          <span class="total-amount">${formatCurrency(invoice.summary.totalTax)}</span>
        </div>
        <div class="grand-total">
          <span class="total-label">Amount Due</span>
          <span class="total-amount">${formatCurrency(invoice.summary.grossTotal)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-section">
        <h4>Terms & Conditions</h4>
        ${invoice.termsAndConditions.slice(0, 3).map(term => `<p>${term}</p>`).join('')}
      </div>
      <div class="footer-section">
        <h4>Authorized By</h4>
        <p><strong>${invoice.authorizedSignatory.name}</strong></p>
        <p>${invoice.authorizedSignatory.designation}</p>
      </div>
      <div class="footer-section">
        <h4>Bank Details</h4>
        <p><strong>${invoice.bankDetails.accountNumber}</strong></p>
        <p>IFSC: ${invoice.bankDetails.ifscCode}</p>
        <p>${invoice.bankDetails.branch}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Main: Load fixture and render
 */
async function main() {
  try {
    console.log('📄 Generating invoice-small.pdf...\n');

    // Load fixture
    const fixturePath = '/opt/Inventory-control-prod/fixtures/invoices/invoice-small.json';
    const fixtureRaw = fs.readFileSync(fixturePath, 'utf-8');
    const fixture = JSON.parse(fixtureRaw) as InvoiceFixture;

    console.log(`✅ Loaded fixture: ${fixture.name}`);
    console.log(`   Purpose: ${fixture.purpose}`);

    // Validate numbers
    const invoice = fixture.invoice;
    console.log(`\n📊 Invoice Numbers:`);
    console.log(`   Number: ${invoice.invoiceNumber}`);
    console.log(`   Date: ${invoice.invoiceDate}`);
    console.log(`   Status: ${invoice.status}`);
    console.log(`   Amount Due: ₹${invoice.summary.grossTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
    console.log(`   Items: ${invoice.lineItems.length}`);

    // Render HTML
    console.log(`\n🎨 Rendering HTML template...`);
    const html = renderInvoiceHtml(invoice);

    // Save HTML for inspection
    const htmlOutputPath = '/tmp/invoice-small.html';
    fs.writeFileSync(htmlOutputPath, html);
    console.log(`   HTML saved: ${htmlOutputPath}`);
    console.log(`   HTML size: ${(html.length / 1024).toFixed(2)}KB`);

    // Output summary
    console.log(`\n✅ HTML generation complete`);
    console.log(`\n📝 NEXT STEPS:`);
    console.log(`   1. Review HTML: open ${htmlOutputPath} in browser`);
    console.log(`   2. Ask three voices:`);
    console.log(`      - Customer: Can I find the amount due in 5 seconds?`);
    console.log(`      - Accountant: Can I verify totals without a calculator?`);
    console.log(`      - Business Owner: Am I proud to send this?`);
    console.log(`   3. Note presentation issues (not business logic)`);
    console.log(`   4. When ready, run: npx puppeteer test -- <html-path>`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
