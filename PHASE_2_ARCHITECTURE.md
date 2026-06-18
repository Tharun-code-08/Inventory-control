# Phase 2: PDF Integration with Branding

## Overview

Phase 2 focuses on integrating the centralized branding system into all PDF generation services while maintaining historical accuracy through immutable snapshots.

---

## Architecture: PdfBrandingAdapter

Instead of duplicating branding logic across 7+ PDF services, use a centralized adapter:

```
BrandingService (Phase 1)
       ↓
PdfBrandingAdapter (NEW - Phase 2)
       ↓
├─ InvoicePdfService
├─ PurchaseOrderPdfService
├─ QuotationPdfService
├─ GoodsIssuePdfService
├─ GoodsReceiptPdfService
├─ EWayBillPdfService
├─ DeliveryChallnPdfService
├─ ReportService
└─ (future PDF types)
       ↓
PDF Engine (Puppeteer)
```

---

## PdfBrandingAdapter Interface

```typescript
interface IPdfBrandingAdapter {
  // Apply company header with logo, name, GST
  applyCompanyHeader(pdf: any, snapshot: BrandingSnapshotV1): void;

  // Apply footer text
  applyFooter(pdf: any, snapshot: BrandingSnapshotV1): void;

  // Apply signature/seal if configured
  applySignature(pdf: any, snapshot: BrandingSnapshotV1): void;
  applySeal(pdf: any, snapshot: BrandingSnapshotV1): void;

  // Apply theme colors
  applyTheme(pdf: any, snapshot: BrandingSnapshotV1): void;

  // Apply based on document settings (showLogo, showGST, etc)
  applyDocumentSettings(pdf: any, snapshot: BrandingSnapshotV1): void;
}
```

---

## Snapshot Persistence Flow

### Create New Document (e.g., Invoice)

```typescript
// 1. Create snapshot BEFORE PDF generation
const snapshot = await brandingService.createBrandingSnapshot(
  companyId,
  shopId,
  'INVOICE',
  { gstNumber: '33AAACT1234H1Z0', ... }
);

// 2. Save invoice with snapshot
const invoice = await prisma.invoiceHeader.create({
  data: {
    invoiceNumber: 'INV-2026-001',
    customerId,
    shopId,
    brandingSnapshot: snapshot,  // immutable record
    status: 'DRAFT',
    ...
  }
});

// 3. Generate PDF using snapshot
const pdf = await invoicePdfService.generatePdf(invoice);

// 4. Save PDF to storage (S3, disk, etc)
await storageService.save(`invoices/${invoice.id}.pdf`, pdf);
```

### Reprint Existing Document

```typescript
// 1. Fetch invoice (has snapshot from creation)
const invoice = await prisma.invoiceHeader.findUnique({
  where: { id: invoiceId }
});

// 2. Use snapshot if exists (historical accuracy)
const brandingToUse = invoice.brandingSnapshot 
  ? invoice.brandingSnapshot
  : await brandingService.createBrandingSnapshot(...);

// 3. Generate PDF using branding
const pdf = await invoicePdfService.generatePdf(invoice, brandingToUse);

// 4. Return PDF (no snapshot update needed)
```

---

## Phase 2 Implementation Order

### Step 1: Create PdfBrandingAdapter

```
apps/api/src/common/pdf/pdf-branding.adapter.ts
```

- Centralized branding application logic
- Reusable across all PDF services
- Easy to test in isolation
- Easy to swap PDF engines (Puppeteer → other)

### Step 2: Integrate with Invoice PDF Service

```typescript
@Injectable()
export class InvoicePdfService {
  constructor(
    private brandingAdapter: PdfBrandingAdapter,
    private htmlEngine: HtmlToPdfEngine
  ) {}

  async generatePdf(invoice: InvoiceHeader): Promise<Buffer> {
    // 1. Build PDF HTML (invoice items, totals, etc)
    const html = this.buildInvoiceHtml(invoice);

    // 2. Apply branding from snapshot
    const htmlWithBranding = this.brandingAdapter.applyBranding(
      html,
      invoice.brandingSnapshot
    );

    // 3. Render to PDF
    return this.htmlEngine.toPdf(htmlWithBranding);
  }
}
```

### Step 3: Replicate for Other PDF Services

- PurchaseOrderPdfService
- QuotationPdfService
- GoodsIssuePdfService
- GoodsReceiptPdfService
- EWayBillPdfService
- DeliveryChallnPdfService
- ReportService

Each follows same pattern:
1. Build domain HTML
2. `brandingAdapter.applyBranding(html, snapshot)`
3. Render to PDF

### Step 4: Add Snapshot Persistence Hooks

- Create hook in `InvoicesService.create()` to generate snapshot
- Create hook in `PurchaseOrdersService.create()` to generate snapshot
- (repeat for all document types)

### Step 5: Historical PDF Tests

```typescript
describe('Historical PDF Regeneration', () => {
  it('should regenerate invoice with original branding', async () => {
    // 1. Create invoice with Logo A
    const invoice1 = await createInvoice({ logoUrl: 'a.png' });
    const pdf1 = await invoicePdfService.generatePdf(invoice1);

    // 2. Change company branding to Logo B
    await updateCompanyLogo('b.png');

    // 3. Reprint invoice (should still show Logo A)
    const pdf2 = await invoicePdfService.generatePdf(invoice1);

    // 4. Verify Logo A in both PDFs
    expect(extractLogoFromPdf(pdf1)).toBe(extractLogoFromPdf(pdf2));
  });
});
```

---

## Key Design Principles

### 1. Immutability
- Snapshot is created once at document creation
- Never modified
- PDF regeneration uses stored snapshot

### 2. Fallback for New Documents
```typescript
// If snapshot is missing (legacy data), use current branding
const branding = invoice.brandingSnapshot 
  || await brandingService.getEffectiveBranding(companyId, shopId);
```

### 3. No Duplicate Logic
- Branding application logic is in `PdfBrandingAdapter`
- Not spread across Invoice/PO/Quotation services
- Easy to maintain and extend

### 4. Future-Proof
- Switch PDF engines without touching business logic
- Add new document types by using same adapter
- Migrate to new branding rules without breaking old snapshots

---

## Success Criteria

- ✅ All PDFs use branding snapshots
- ✅ Historical PDFs regenerate with original branding
- ✅ No branding logic duplication across services
- ✅ New document types use same adapter pattern
- ✅ Backward compatible (fallback to current branding)
- ✅ Comprehensive tests for snapshot regeneration

---

## Timeline

- **Week 1**: PdfBrandingAdapter + Invoice integration
- **Week 2**: Replicate to 5 other core PDF services
- **Week 3**: Snapshot hooks + historical tests
- **Week 4**: Edge cases + QA

---

## Future Phases (Phase 3+)

- Email branding (send invoices with company branding)
- Export branding (Excel, CSV with company headers)
- Report branding (multi-page reports with headers/footers)
- Multi-language branding templates
