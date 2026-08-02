import { composeDigest } from './dispatch-job';

describe('composeDigest', () => {
  it('summarises a single invoice', () => {
    const d = composeDigest([{ invoiceNumber: 'INV-1', balanceDue: 5000 }]);
    expect(d.total).toBe(5000);
    expect(d.summary).toMatch(/1 outstanding invoice/);
    expect(d.summary).toMatch(/INV-1: ₹5,000/);
  });

  it('coalesces multiple invoices into one digest with the correct total', () => {
    const d = composeDigest([
      { invoiceNumber: 'INV-1', balanceDue: 5000 },
      { invoiceNumber: 'INV-2', balanceDue: 12000 },
    ]);
    expect(d.total).toBe(17000);
    expect(d.summary).toMatch(/2 outstanding invoices totalling ₹17,000/);
    expect(d.summary).toMatch(/INV-2: ₹12,000/);
  });
});
