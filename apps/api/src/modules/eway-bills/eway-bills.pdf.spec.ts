import { generateEwayBillHtml } from './eway-bills.pdf';

describe('generateEwayBillHtml', () => {
  it('escapes user-supplied text so it cannot inject markup into the rendered PDF', () => {
    const html = generateEwayBillHtml({
      ewayBillNumber: 'EWB1',
      status: 'DRAFT',
      documentNumber: 'INV-1',
      documentDate: '2026-10-01',
      supplyType: 'OUTWARD',
      documentType: 'TAX_INVOICE',
      fromName: 'Sharma & Sons',
      toName: '<img src="http://169.254.169.254/latest/meta-data/">',
      vehicleNumber: '<script>alert(1)</script>',
      taxableValue: 100,
      cgstValue: 9,
      sgstValue: 9,
      igstValue: 0,
      cessValue: 0,
      totalValue: 118,
      items: [{ productName: '<b>x</b>', hsnCode: '8471', quantity: 1, unit: 'NOS', taxableAmount: 100, gstRate: 18, total: 118 }],
    });

    expect(html).not.toContain('<img src=');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('Sharma &amp; Sons');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
