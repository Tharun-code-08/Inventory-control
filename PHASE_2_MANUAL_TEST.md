# Phase 2: Manual End-to-End Testing

## Architecture Status: FROZEN ✅

No more changes to:
- Snapshot structure
- Checksum logic
- Adapter methods
- PDF flow

Ready for manual proof.

---

## Test Sequence (DO NOT AUTOMATE YET)

### Step 1: Generate Invoice A

**Action:**
- Create an invoice via UI or API
- Note invoice ID (call it `INVOICE_A_ID`)
- Generate PDF via `/invoices/{INVOICE_A_ID}/pdf`
- **Save PDF locally as `invoice_a_original.pdf`**

**Verification:**
- PDF displays correctly
- Logo visible
- Company name/GST/address visible
- Footer visible
- Theme colors applied

**Next:**
→ Go to Step 2

---

### Step 2: Verify Snapshot in Database

**Action:**
Run this SQL:
```sql
SELECT id, branding_snapshot
FROM invoice_headers
WHERE id = '<INVOICE_A_ID>'
LIMIT 1;
```

**Check for JSON fields:**
```json
{
  "version": "V1",
  "checksum": "sha256_hex_string...",
  "generatedAt": "2026-06-18T...",
  "company": { "id": "...", "companyName": "...", ... },
  "assets": { "logoUrl": "...", ... },
  "theme": { "primaryColor": "...", ... },
  "documentSettings": { "showLogo": true, ... },
  "footerText": "..."
}
```

**Verification:**
- ✅ All fields present
- ✅ checksum is a 64-char hex string (SHA256)
- ✅ version = "V1"

**Next:**
→ Go to Step 3

---

### Step 3: Change Company Branding

**Action:**
Update company branding via API/UI. Change **at least 3 things:**
1. Logo (upload new image OR change URL)
2. Theme colors (primaryColor from current to different)
3. Footer text (change footer message)

**Verification (optional):**
```sql
SELECT id, company_name, branding_profile
FROM companies
WHERE id = '<COMPANY_ID>'
LIMIT 1;
```

Confirm branding_profile JSON has new values.

**Next:**
→ Go to Step 4

---

### Step 4: Regenerate Invoice A PDF ⭐ CRITICAL TEST

**Action:**
Regenerate Invoice A PDF via API:
```
POST /invoices/<INVOICE_A_ID>/pdf?regenerate=true
```

(Or whatever regenerate endpoint exists)

- **Save as `invoice_a_regenerated.pdf`**

**Verification (VISUAL):**
Open both PDFs side-by-side:
- `invoice_a_original.pdf` (Step 1)
- `invoice_a_regenerated.pdf` (Step 4)

**Expected:**
- Logo: Same as original (NOT new logo)
- Colors: Same as original (NOT new colors)
- Footer: Same as original (NOT new footer)
- Everything else: Same

**If invoice_a_regenerated shows OLD branding:**
✅ **SNAPSHOTS WORK** → Go to Step 5

**If invoice_a_regenerated shows NEW branding:**
❌ **SNAPSHOTS BROKEN** → Stop, debug generateChecksum() or regeneratePdf()

**Next:**
→ Go to Step 5

---

### Step 5: Create Invoice B with New Branding

**Action:**
- Create a new invoice (call it `INVOICE_B_ID`)
- Generate PDF
- **Save as `invoice_b_new.pdf`**

**Verification (VISUAL):**
Open `invoice_b_new.pdf`

**Expected:**
- Logo: New logo (from Step 3)
- Colors: New colors (from Step 3)
- Footer: New footer (from Step 3)

**If invoice_b_new shows NEW branding:**
✅ **NEW INVOICES USE CURRENT BRANDING** → Go to Step 6

**If invoice_b_new shows OLD branding:**
❌ **BRANDING SERVICE BROKEN** → Debug createBrandingSnapshot()

**Next:**
→ Go to Step 6

---

### Step 6: Cross-Verify (Final Check)

**Action:**
Open all three PDFs:
- `invoice_a_original.pdf` (original Invoice A)
- `invoice_a_regenerated.pdf` (Invoice A after branding change)
- `invoice_b_new.pdf` (new Invoice B after branding change)

**Expected:**
- Invoice A (original) ≈ Invoice A (regenerated) ≈ Old branding
- Invoice B (new) = New branding
- Invoice A ≠ Invoice B (in appearance)

**Result:**
✅ **Phase 1B PROVEN**

---

## Success Criteria

✅ All 6 steps complete AND
✅ Invoice A shows old branding when regenerated AND
✅ Invoice B shows new branding AND
✅ No checksum errors in logs

**Conclusion:** Historical accuracy guaranteed. Snapshots work.

---

## If Any Step Fails

**Stop testing. Debug the specific failure:**

| Failure | Root Cause | Fix |
|---------|-----------|-----|
| Step 2: checksum missing | Snapshot not created | Check createBrandingSnapshot() |
| Step 4: Invoice A shows new branding | regeneratePdf() not using snapshot | Check asBrandingSnapshotOrNull() |
| Step 5: Invoice B shows old branding | Snapshot cache not invalidated | Check createBrandingSnapshot() |
| Step 6: Checksums don't match | generateChecksum() order changed | Revert to explicit ordering |

Do **not** proceed to Phase 2 until all 6 steps pass.

---

## After Passing All 6 Steps

Freeze Phase 1B. Move to Phase 2:

```
✅ Phase 1B: PROVEN
├── Snapshots created ✅
├── Checksums generated ✅
├── Historical regeneration ✅
├── New documents use current branding ✅
└── Ready for Phase 2

Phase 2: Copy Invoice pattern
├── Purchase Order PDF (replicate Invoice)
├── Quotation PDF (replicate Invoice)
├── Goods Issue PDF (replicate Invoice)
├── Goods Receipt PDF (replicate Invoice)
├── E-Way Bill PDF (replicate Invoice)
└── Reports PDF (replicate Invoice)
```

No more architecture changes. Only implementation.
