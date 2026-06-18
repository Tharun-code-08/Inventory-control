# Phase 2: Invoice PDF Integration (FOCUSED)

## Objective
Prove that Invoice PDF with branding snapshots works end-to-end:
1. Generate invoice → captures branding snapshot at creation time
2. Verify checksum integrity
3. Change company branding
4. Regenerate old invoice PDF → uses ORIGINAL branding (not new)
5. Create new invoice PDF → uses NEW branding

Once this works, replicate the pattern to other document types.

## Status: ✅ READY FOR TESTING

### Implemented (Production-Ready):
- ✅ Phase 1B: Branding system complete (schema, service, snapshots, checksums)
- ✅ InvoicePdfService: Full implementation with generatePdf() and regeneratePdf()
- ✅ PurchaseOrderPdfService: Full implementation following Invoice pattern
- ✅ Module registrations: BrandingModule imported, services provided
- ✅ Type safety: Removed `as any` casts, using asBrandingSnapshot() helper
- ✅ TypeScript: 0 compilation errors

### Architecture Frozen - Ready for Manual Testing

#### Test Steps:

```bash
# 1. Build API
npm run build --workspace=api

# 2. Run database migrations
cd apps/api
npx prisma migrate deploy

# 3. Test scenario
# A. Generate Invoice PDF (creates snapshot with current branding)
curl -X POST /invoices/{invoiceId}/pdf \
  -H "Authorization: Bearer $TOKEN"
# → Response: PDF buffer + snapshot saved to DB

# B. Verify snapshot checksum
# (BrandingService.validateChecksumIntegrity() run on load)

# C. Change company branding
curl -X PATCH /company/branding \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"primaryColor": "#FF0000", ...}'

# D. Regenerate old invoice PDF
curl -X POST /invoices/{invoiceId}/pdf?regenerate=true \
  -H "Authorization: Bearer $TOKEN"
# → Response: PDF using ORIGINAL branding (not new)

# E. Create new invoice PDF
curl -X POST /invoices/{newInvoiceId}/pdf \
  -H "Authorization: Bearer $TOKEN"
# → Response: PDF using NEW branding
```

### Key Verification Points:

1. **Snapshot Persistence**: Old invoice has brandingSnapshot field populated in DB
2. **Checksum Validity**: validateChecksumIntegrity() returns true for valid snapshots
3. **Historical Accuracy**: Regenerated PDF uses original branding, not current
4. **New PDF**: New invoices created after branding change use new branding
5. **Fallback**: If snapshot missing, service gracefully regenerates with current branding

### Schema Status:
- ✅ InvoiceHeader.brandingSnapshot (Json?)
- ✅ PurchaseOrderHeader.brandingSnapshot (Json?)
- ⏳ Other document types (future: implement same pattern)

### Build & Test Checklist:

- [ ] `npm run build --workspace=api` succeeds (0 errors)
- [ ] `npm run test --workspace=api` passes all tests
- [ ] Database migrations apply cleanly
- [ ] Can generate Invoice PDF with snapshot
- [ ] Can regenerate old Invoice PDF with original branding
- [ ] Can generate new Invoice PDF with updated branding
- [ ] Checksum validates correctly
- [ ] Fallback behavior works (missing snapshot)

### After Invoice Proof-of-Concept:

Replicate to remaining document types using identical pattern:
1. Quotation (SalesOrderHeader)
2. Goods Issue (GoodsIssueHeader)
3. Goods Receipt (GoodsReceiptHeader)
4. E-Way Bill (EwayBill)
5. Reports (transient, no DB storage)

Each follows:
```typescript
async generatePdf(id: string): Promise<Buffer> {
  const doc = await loadDocument(id);
  const snapshot = doc.snapshot || await brandingService.createBrandingSnapshot(...);
  const html = renderHtml(viewModel);
  html = PdfBrandingAdapter.applyAllBranding(html, snapshot);
  const pdf = await renderPdf(html);
  if (!doc.snapshot) await updateDocumentSnapshot(id, snapshot);
  return pdf;
}
```

## Success Criteria

✅ **Phase 2 Success**: Invoice PDF generates, regenerates with original branding, and new PDFs use updated branding.

After proof: 5 more services replicate this pattern.
