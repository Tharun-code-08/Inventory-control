# Invoice PDF v1.1 - Next Session: REAL VALIDATION PLAN

**Current Status:** Fixtures prepared, not yet validated by running system  
**Fixtures Ready:** 5 (small, legal, large, stress, nightmare)  
**Schema:** v1.1 frozen  
**Next Step:** Generate actual PDFs and validate end-to-end  

---

## What "Prepared" Means vs. "Passed"

### ✅ PREPARED (Current State)
- Fixtures are well-formed JSON
- Internal calculations are self-consistent
- Schema is frozen and documented
- 696 line items are real (not synthetic)
- All required legal fields present
- Verification scripts pass

### ❌ NOT YET PASSED (Will happen next session)
- PDFs have not been generated
- Visual rendering not inspected
- Performance not measured
- Three-way reconciliation not done
- Nightmare fixture not tested
- Real system not involved

**Only when PDFs exist and are correct can we declare gates passed.**

---

## Session Flow

### Phase 1: Setup (10 min)

1. **Start the API**
   ```bash
   cd apps/api
   npm run dev
   ```

2. **Verify fixtures are accessible**
   ```bash
   ls -lh fixtures/invoices/invoice-*.json
   ```

3. **Prepare output directory**
   ```bash
   mkdir -p /tmp/invoice-pdfs
   ```

---

### Phase 2: PDF Generation (30 min)

Generate PDFs for all 5 fixtures.

#### Option A: Via API (recommended)
```bash
curl -X POST http://localhost:3000/api/documents/render \
  -H "Content-Type: application/json" \
  -d @fixtures/invoices/invoice-small.json \
  > /tmp/invoice-pdfs/invoice-small.pdf
```

#### Option B: Via Database
Load fixture data into database, then:
```typescript
const pdf = await documentPdfFacade.renderInvoicePdfById(invoiceId);
fs.writeFileSync(`/tmp/invoice-pdfs/invoice-${invoiceId}.pdf`, pdf);
```

#### Files to generate:
- `invoice-small.pdf` (5 items, expect 1 page)
- `invoice-legal.pdf` (6 items, expect 1 page)
- `invoice-large.pdf` (150 items, expect 8-9 pages)
- `invoice-stress.pdf` (500 items, expect 28 pages)
- `invoice-nightmare.pdf` (35 items, expect 3-4 pages with edge cases)

---

### Phase 3: Gate 1 Validation (30 min)

**Three-way reconciliation: Database == ViewModel == PDF**

#### Step 1: Database Totals (SQL)
```sql
-- For each invoice:
SELECT
  invoiceNumber,
  SUM(quantity * unit_price) as calculated_subtotal,
  SUM(discount) as calculated_discount,
  SUM(quantity * unit_price - discount) as calculated_taxable,
  SUM(cgst_amount) as calculated_cgst,
  SUM(sgst_amount) as calculated_sgst,
  SUM(cgst_amount + sgst_amount) as calculated_tax,
  SUM(quantity * unit_price - discount + cgst_amount + sgst_amount) as calculated_gross
FROM invoice_line_items
WHERE invoice_header_id = ?
GROUP BY invoiceNumber;
```

Save results as `db-totals.json`

#### Step 2: ViewModel Totals (Extract from fixture summary)
```json
{
  "invoice-small": {
    "subtotal": 259999.98,
    "discountAmount": 5037.45,
    "taxableAmount": 254962.53,
    "cgstAmount": 18796.63,
    "sgstAmount": 18796.63,
    "totalTax": 37593.26,
    "grossTotal": 292555.79
  }
}
```

Save as `viewmodel-totals.json`

#### Step 3: PDF Totals (Extract text)
Use Python/Node script to extract text from PDF:
```python
import PyPDF2

with open('/tmp/invoice-pdfs/invoice-small.pdf', 'rb') as f:
    pdf = PyPDF2.PdfReader(f)
    text = pdf.pages[0].extract_text()
    # Parse totals from text
    # Save to pdf-totals.json
```

#### Step 4: Three-Way Comparison
```javascript
if (db.grossTotal === viewmodel.grossTotal && 
    viewmodel.grossTotal === pdf.grossTotal) {
  console.log('✓ GATE 1 PASS');
} else {
  console.log('✗ GATE 1 FAIL');
  console.log('DB:', db.grossTotal);
  console.log('VM:', viewmodel.grossTotal);
  console.log('PDF:', pdf.grossTotal);
}
```

---

### Phase 4: Gate 2 Validation (20 min)

**Visual inspection of PDFs for legal completeness**

For each PDF, verify:

**invoice-small.pdf:**
- [ ] Company name, address, GSTIN, phone visible
- [ ] Customer name, address, GSTIN visible
- [ ] Invoice number, date, due date shown
- [ ] All 5 line items render with SKU, HSN, Qty, Price
- [ ] Totals section shows: Subtotal, Discount, Tax, Grand Total
- [ ] GST breakdown (CGST: X, SGST: X) visible
- [ ] Terms & Conditions listed
- [ ] Bank details present

**invoice-legal.pdf:**
- [ ] Same as above, 6 items
- [ ] Authorized Signatory visible
- [ ] Place of Supply shown (Tamil Nadu)
- [ ] All 4 tax rates present (0%, 5%, 12%, 18%)

**invoice-large.pdf:**
- [ ] First page: header with company/customer info
- [ ] Middle pages: consistent table layout, header repeats
- [ ] Last page: totals section
- [ ] No rows split awkwardly across pages
- [ ] All 150 items rendered (spot check 10-20 random rows)
- [ ] Page count: 8-9 pages

**invoice-stress.pdf:**
- [ ] First page: header
- [ ] All 500 rows rendered (no clipping)
- [ ] Page count: ~28 pages
- [ ] Last page: final totals
- [ ] No overlapping text

**invoice-nightmare.pdf:**
- [ ] Long company name wraps cleanly
- [ ] Long customer address displays (2+ lines OK)
- [ ] All 35 items render without clipping
- [ ] Long remarks section visible in footer
- [ ] Terms & Conditions (5 items) readable
- [ ] No layout breakage from edge cases

---

### Phase 5: Gate 3 Validation (20 min)

**Performance and rendering metrics**

Generate all PDFs and measure:

```javascript
const metrics = {
  'invoice-small': {
    renderTimeMs: 800,
    pdfSizeBytes: 250000,
    pageCount: 1,
    pageBreakCount: 0,
    maxRowHeightPx: 24,
    peakMemoryMb: 120,
    status: 'PASS'
  },
  'invoice-legal': {
    renderTimeMs: 850,
    pdfSizeBytes: 270000,
    pageCount: 1,
    pageBreakCount: 0,
    maxRowHeightPx: 24,
    peakMemoryMb: 125,
    status: 'PASS'
  },
  'invoice-large': {
    renderTimeMs: 2200,
    pdfSizeBytes: 4500000,
    pageCount: 9,
    pageBreakCount: 8,
    maxRowHeightPx: 28,
    peakMemoryMb: 280,
    status: 'PASS'
  },
  'invoice-stress': {
    renderTimeMs: 4800,
    pdfSizeBytes: 9200000,
    pageCount: 28,
    pageBreakCount: 27,
    maxRowHeightPx: 32,
    peakMemoryMb: 410,
    status: 'PASS'
  },
  'invoice-nightmare': {
    renderTimeMs: 1200,
    pdfSizeBytes: 550000,
    pageCount: 4,
    pageBreakCount: 3,
    maxRowHeightPx: 40,
    peakMemoryMb: 135,
    status: 'PASS or FAIL?'
  }
};
```

**Pass Criteria:**

| Metric | Target | Pass if |
|--------|--------|---------|
| Render Time | < 1s small, < 3s large, < 5s stress | Achieved ✓ |
| PDF Size | < 500KB small, < 10MB stress | Achieved ✓ |
| Memory | Stable, < 500MB peak | No leaks ✓ |
| Page Count | Matches estimate | Within ±1 ✓ |
| No Clipping | Visual inspection | Yes ✓ |
| No Overlaps | Visual inspection | Yes ✓ |

---

## Expected Outcomes

### If all PDFs render correctly:

```
✓ GATE 1 PASS
  Database Totals == ViewModel Totals == PDF Totals

✓ GATE 2 PASS
  All legal fields present and visible in PDF

✓ GATE 3 PASS
  5, 150, 500 items all render without errors
  Performance metrics acceptable
  Edge cases handled gracefully
```

### If nightmare fixture breaks:

This is **expected and acceptable**. The nightmare fixture exists to find the breaking point. When it breaks, document:

1. What broke? (clipped text, overlapping rows, etc.)
2. At what item count? (15 items? 35? 50?)
3. What's the fix? (add padding, increase page margins, etc.)

Then iterate on the template.

---

## Checklist for Next Session

Before starting:
- [ ] API is running (`npm run dev` in apps/api)
- [ ] Database is accessible
- [ ] Fixtures are at `/opt/Inventory-control-prod/fixtures/invoices/`
- [ ] PDF output directory exists

During validation:
- [ ] Generate 5 PDFs (small, legal, large, stress, nightmare)
- [ ] Run SQL queries to extract database totals
- [ ] Extract text from each PDF
- [ ] Compare all three sources for each invoice
- [ ] Print PDFs (or view in Chrome) for visual inspection
- [ ] Measure render time and memory
- [ ] Document any rendering issues

After validation:
- [ ] Update renderingMetrics in each fixture
- [ ] Create summary report: `GATE_VALIDATION_RESULTS.md`
- [ ] If all pass: Document as ✓ Gate 1-3 VERIFIED PASS
- [ ] If any fail: Document specific issues and fixes needed

---

## Important Notes

1. **This is where reality takes over.** Fixtures prove intent; PDFs prove reality.

2. **Nightmare fixture will probably break something.** That's its job. Fix it, iterate.

3. **Three-way reconciliation is non-negotiable.** If PDF totals don't match database, you have a bug to fix.

4. **Document everything.** Render times, memory usage, page counts—these become your baseline.

5. **Print and read at least one PDF by hand.** Not just software validation. You're the auditor now.

---

## Success Criteria (Hard Stop)

Only declare gates passed when:

1. ✓ Database totals, ViewModel totals, and PDF totals **exactly match** (±0.01 rupees)
2. ✓ All required fields visible in PDF
3. ✓ Visual inspection: looks professional and trustworthy
4. ✓ Performance: small < 1s, large < 3s, stress < 5s
5. ✓ Memory: stable, no leaks during stress test
6. ✓ Nightmare fixture: either passes or documented reason for failure

Until all 6 are true: **Gates are not passed.**

---

## What Comes After (Gates 4-6)

Once 1-3 are passed:

**Gate 4: Human Trust Test**
- Print invoice-small and invoice-large
- Hand them to a non-technical person
- Ask: "Would you trust this invoice for ₹25 lakhs?"
- If yes → PASS

**Gate 5: Authenticity (SHA256)**
- Generate invoice twice
- Hash both PDFs
- Compare: must be byte-identical
- PASS if hashes match

**Gate 6: Reproducibility**
- Delete all PDFs
- Regenerate them
- Compare against originals
- PASS if byte-identical

But don't start those until 1-3 are **proven**, not just prepared.

---

**Ready for next session: PDF generation and real validation.**
