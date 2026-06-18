# Phase 2: PDF Integration with Branding Snapshots

## Status: IN PROGRESS

Phase 2 focuses on integrating the branding system from Phase 1B into all PDF generation services. This ensures every generated PDF has:
- Immutable branding snapshots (historical accuracy)
- Checksum verification (corruption detection)
- Consistent styling via PdfBrandingAdapter
- Single entry point for all branding application

## Implementation Pattern (Proven with Invoice PDF)

Each PDF service follows this pattern:

```typescript
// 1. Load document data
const document = await loadDocumentForPdf(...);

// 2. Load shop/company for branding
const shop = await prisma.shop.findUnique(...);

// 3. Get or create branding snapshot
const snapshot = document.brandingSnapshot 
  || await brandingService.createBrandingSnapshot(
    shop.company.id, 
    shopId, 
    'DOCUMENT_TYPE'
  );

// 4. Build HTML
const viewModel = await buildDocumentPdfViewModel(...);
let html = renderDocumentHtml(viewModel);

// 5. Apply branding (SINGLE ENTRY POINT)
html = PdfBrandingAdapter.applyAllBranding(html, snapshot);

// 6. Render PDF
const pdf = await renderHtmlToPdfBuffer(html);

// 7. Persist snapshot if new
if (!document.brandingSnapshot) {
  await updateDocumentWithSnapshot(...);
}
```

## PDF Services Implemented

| Service | Status | Path |
|---------|--------|------|
| Invoice PDF | ✅ DONE | `src/modules/invoices/invoice-pdf.service.ts` |
| Purchase Order PDF | ✅ DONE | `src/modules/purchase-orders/purchase-order-pdf.service.ts` |
| Quotation PDF | ⏳ NEXT | `src/modules/sales-quotations/quotation-pdf.service.ts` |
| Goods Issue PDF | ⏳ TODO | `src/modules/goods-issues/goods-issue-pdf.service.ts` |
| Goods Receipt PDF | ⏳ TODO | `src/modules/goods-receipts/goods-receipt-pdf.service.ts` |
| E-Way Bill PDF | ⏳ TODO | `src/modules/eway-bills/eway-bill-pdf.service.ts` |
| Reports PDF | ⏳ TODO | `src/modules/reports/reports-pdf.service.ts` |

## Key Design Principles

### 1. Single Entry Point for Branding
All PDF services use:
```typescript
PdfBrandingAdapter.applyAllBranding(html, snapshot)
```

No PDF service should call:
- `applyHeader()` directly
- `applyFooter()` directly
- `applySignature()` directly
- Any other private methods

### 2. Immutable Snapshots
- Snapshot captured at document creation
- Snapshot never modified
- Reprint uses same snapshot for historical accuracy
- Checksum verifies integrity

### 3. Fallback Behavior
- If snapshot missing: regenerate from current branding (warns in logs)
- If checksum fails: regenerate from current branding (warns in logs)
- Services never fail due to branding issues

## Testing Strategy

### Unit Tests
- Snapshot creation and validation
- Checksum generation and verification
- Adapter branding application

### Integration Tests
- Complete PDF generation flow
- Historical regeneration with original branding
- Branch override behavior
- Company branding changes don't affect old PDFs

### Historical Accuracy Tests (Phase 1B)
Already defined in `test/branding/historical-pdf-regeneration.spec.ts`:
- Old invoices regenerate with original branding
- Brand changes don't affect historical PDFs
- Snapshots are immutable
- Checksums detect corruption

## Deployment Checklist

Before Phase 2 is complete:
- [ ] All 7 PDF services implemented
- [ ] All tests passing
- [ ] No breaking changes to existing PDF endpoints
- [ ] Snapshot persistence working for all document types
- [ ] Checksum verification working
- [ ] Historical PDF regeneration tested
- [ ] Documentation updated

## Notes

- Each service is independent; can be deployed separately
- Pattern is identical across all document types
- No refactoring of PDF builders needed
- Backward compatible: old documents without snapshots work with fallback
- Phase 2 can proceed independently of any other features
