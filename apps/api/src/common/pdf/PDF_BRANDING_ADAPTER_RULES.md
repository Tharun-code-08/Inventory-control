# PdfBrandingAdapter: Design Rules

## Core Principle: STATELESS & PURE

`PdfBrandingAdapter` must be a **pure, stateless adapter** that applies branding to PDF HTML/content.

---

## MUST DO

✅ Accept `BrandingSnapshotV1` as parameter
✅ Accept PDF/HTML object as parameter
✅ Return modified PDF/HTML
✅ Apply visual styling based on snapshot
✅ Be testable in isolation (no mocks needed)
✅ Be engine-agnostic (Puppeteer → other engines)

```typescript
class PdfBrandingAdapter {
  applyHeader(html: string, snapshot: BrandingSnapshotV1): string
  applyFooter(html: string, snapshot: BrandingSnapshotV1): string
  applySignature(html: string, snapshot: BrandingSnapshotV1): string
  applySeal(html: string, snapshot: BrandingSnapshotV1): string
  applyTheme(html: string, snapshot: BrandingSnapshotV1): string
  applyDocumentSettings(html: string, snapshot: BrandingSnapshotV1): string
}
```

---

## MUST NOT DO

❌ Query database
❌ Call BrandingService
❌ Call Redis
❌ Fetch company info
❌ Fetch user info
❌ Make HTTP requests
❌ Have constructor dependencies (except logger)
❌ Maintain state between calls

---

## Why?

### Problem 1: Hidden Dependencies

If adapter calls BrandingService:
```
PdfBrandingAdapter
  ↓
BrandingService
  ↓
Redis / Database
  ↓
(now adapter has hidden network calls)
```

**Result:** Adapter becomes hard to test, slow, and brittle.

### Problem 2: Difficult Migration

If later you switch from Puppeteer to another PDF engine:
```
// Current: PdfBrandingAdapter knows about BrandingService
const html = adapter.applyBranding(pdf);

// After engine switch: Still depends on BrandingService?
// This creates tight coupling to branding LOGIC, not just styling
```

### Problem 3: Distributed Logic

Branding logic ends up in THREE places:
1. BrandingService (fetching)
2. PdfBrandingAdapter (applying)
3. Invoice/PO/Quotation services (orchestrating)

**Result:** Hard to maintain, easy to break.

---

## Correct Pattern

```typescript
// In InvoicePdfService
async generatePdf(invoice: InvoiceHeader): Promise<Buffer> {
  // 1. Get branding (service responsibility)
  const snapshot = invoice.brandingSnapshot 
    || await this.brandingService.createBrandingSnapshot(...);

  // 2. Build HTML (domain responsibility)
  const html = this.buildInvoiceHtml(invoice);

  // 3. Apply branding (adapter responsibility - PURE FUNCTION)
  const htmlWithBranding = this.adapter.applyBranding(html, snapshot);

  // 4. Render PDF (engine responsibility)
  return this.pdfEngine.toPdf(htmlWithBranding);
}
```

---

## Test Example

```typescript
describe('PdfBrandingAdapter', () => {
  let adapter: PdfBrandingAdapter;

  beforeEach(() => {
    // No mocks needed - pure function
    adapter = new PdfBrandingAdapter();
  });

  it('should apply company header', () => {
    const snapshot: BrandingSnapshotV1 = {
      version: 1,
      generatedAt: '2026-06-18T10:00:00Z',
      generatedBy: { userId: 'user-1' },
      documentType: 'INVOICE',
      company: { name: 'ACME Corp', address: '123 Main' },
      // ... rest of snapshot
    };

    const html = '<html><body>Invoice</body></html>';
    const result = adapter.applyHeader(html, snapshot);

    expect(result).toContain('ACME Corp');
    expect(result).toContain('123 Main');
  });

  it('should respect documentSettings', () => {
    const snapshot: BrandingSnapshotV1 = {
      // ...
      documentSettings: {
        showLogo: false,
        showGST: true,
        // ...
      },
    };

    const html = '<html><body>Invoice</body></html>';
    const result = adapter.applyDocumentSettings(html, snapshot);

    expect(result).not.toContain('<img class="logo">');
    expect(result).toContain('GST');
  });
});
```

---

## Migration Path (Future)

If switching PDF engines, only `PdfEngine` changes, not `PdfBrandingAdapter`:

```
// Current
PdfEngine = PuppeteerEngine

// Future: Swap engine
PdfEngine = WKHtmlToPdfEngine

// PdfBrandingAdapter stays the same
// No changes to applyHeader(), applyFooter(), etc
```

---

## Summary

| Concern | Solution |
|---------|----------|
| Testing | No mocks needed |
| Maintenance | Single responsibility |
| Migration | Engine-agnostic |
| Performance | No network/DB calls |
| Clarity | Clear data flow |

**Keep PdfBrandingAdapter pure. Keep it simple. Keep it testable.**
