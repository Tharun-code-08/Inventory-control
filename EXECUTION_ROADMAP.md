# Execution Roadmap

## Status: LOCKED ✅

No more design documents.
No more architecture changes.
No more UI sketches.

**Time to build.**

---

## Phase 1: Manual Testing (BEFORE UI)

### Objective
Prove Phase 1B backend works end-to-end.

### Steps
1. Create Invoice A
2. Generate PDF → save as `invoice_a_original.pdf`
3. Verify snapshot in DB (checksum, all fields present)
4. Change company branding (logo, colors, footer)
5. Regenerate Invoice A PDF → save as `invoice_a_regenerated.pdf`
6. **CRITICAL**: Confirm `invoice_a_regenerated.pdf` shows OLD branding
7. Create Invoice B
8. Generate Invoice B PDF
9. Confirm Invoice B shows NEW branding

### Success Criteria
- ✅ Invoice A regeneration shows old branding
- ✅ Invoice B creation shows new branding
- ✅ No manual SQL queries needed (all via API)

### If Tests Fail
Stop. Debug snapshot persistence, checksum validation, or regeneratePdf logic.
Do not proceed to UI.

### If Tests Pass
→ Proceed to Phase 2: Build Branding UI

---

## Phase 2: Branding UI Implementation

### BUILD ORDER (strictly sequential)

#### Step 1: Company Tab
**What to build:**
- Company Name input
- Legal Name input
- GST Number input
- PAN Number input
- Address textarea
- Phone input
- Email input
- Website input
- Footer Text textarea
- **Theme colors:** Primary, Secondary, Accent (color pickers)
- Status indicator (top-right)
- Save button

**APIs:**
```
GET /branding/company
PUT /branding/company
```

**Success criteria:**
- Form loads
- Can edit fields
- Save persists to DB
- Status indicator updates

**Do NOT proceed until:** All form fields work and API integrates.

---

#### Step 2: Assets Tab
**What to build:**
- Logo upload/preview/delete
- Signature upload/preview/delete
- Seal upload/preview/delete
- Save button

**APIs:**
```
POST /branding/assets/logo
POST /branding/assets/signature
POST /branding/assets/seal
DELETE /branding/assets/logo
DELETE /branding/assets/signature
DELETE /branding/assets/seal
GET /branding/assets
```

**Success criteria:**
- Can upload images
- Previews display
- Can delete assets
- DB persists URLs

**Do NOT proceed until:** Upload/delete/preview all work.

---

#### Step 3: Preview Tab ⭐ CRITICAL
**What to build:**
- Document type buttons (Invoice, PO, Quotation)
- View mode options (Desktop, Mobile, Print)
- Zoom controls (50%, 75%, 100%)
- Live preview area (HTML render via iframe or dangerouslySetInnerHTML)
- Download Sample PDF button

**APIs:**
```
POST /branding/preview (returns HTML)
POST /branding/sample-pdf (returns PDF)
```

**Success criteria:**
- Change logo → preview updates instantly
- Change footer → preview updates instantly
- Change colors → preview updates instantly
- Toggle GST → preview updates instantly
- Download PDF works

**This is the de-risking step.**

Once Preview works, you know:
- ✅ Branding APIs work
- ✅ HTML rendering works
- ✅ Theme system works
- ✅ Assets work
- ✅ Real-time updates work

**Do NOT proceed until:** Preview is rock-solid and instant.

---

#### Step 4: Document Templates Tab
**What to build:**
- For each document type (Invoice, PO, Quotation, Goods Issue, Goods Receipt, Delivery Challan):
  - Toggles: Show Logo, Show GST, Show Address, Show Footer, Show Signature, Show Seal
  - Save button

**APIs:**
```
GET /branding/document/:documentType
PUT /branding/document/:documentType
```

**Success criteria:**
- Can toggle each setting
- Changes persist to DB
- Preview updates reflect toggle changes

**Do NOT proceed until:** All toggles work and Preview validates changes.

---

#### Step 5: Branch Overrides Tab
**What to build:**
- Branch selector dropdown
- Radio buttons: "Use Company Branding" vs "Custom Branding"
- Custom branding fields (logo, footer, address, phone, email)
- Save button

**APIs:**
```
GET /branding/branches
PUT /branding/branches/:shopId
```

**Success criteria:**
- Can select branch
- Can toggle override mode
- Fields collapse/expand correctly
- Preview updates for branch overrides
- DB persists override settings

**This is last because it depends on all previous tabs working.**

---

## First Real Milestone

**NOT:** "Architecture complete" or "UI implemented"

**ACTUAL MILESTONE:**

```
User Opens Branding UI

↓

Tab 1: Company

[Enter company name]
[Enter GST]
[Enter address]
[Enter footer text]
[Select theme colors]
[Save]

↓

Tab 2: Assets

[Upload logo]
[Upload signature]
[Save]

↓

Tab 3: Preview

[Select Invoice]
[Change Desktop view to Mobile]
[Live preview updates with logo, footer, colors]

↓

[Click "Download Sample PDF"]
[PDF downloads]
[PDF matches preview]

↓

Go back to Tab 1

[Change footer text]
[Change primary color]
[Save]

↓

Tab 3: Preview

[Preview updates instantly]

↓

[Download new Sample PDF]
[PDF matches NEW preview]

↓

Go to actual Invoice A (from Phase 1 testing)

[Generate Invoice A PDF again]

↓

Invoice A PDF:
- Shows OLD branding (from Phase 1)
- Footer unchanged
- Colors unchanged
- Logo unchanged

↓

Create new Invoice B

[Generate Invoice B PDF]

↓

Invoice B PDF:
- Shows NEW branding
- Footer changed
- Colors changed

✅ MILESTONE ACHIEVED
```

This single workflow proves:
- ✅ Backend snapshots work
- ✅ UI configuration works
- ✅ Preview renders correctly
- ✅ PDF generation works
- ✅ Historical regeneration works
- ✅ Theme system works
- ✅ Assets work
- ✅ System is production-ready

---

## Phase 3: Replicate PDF Pattern

After Phase 2 Milestone:

Copy `InvoicePdfService` pattern to:
1. Purchase Order PDF
2. Quotation PDF
3. Goods Issue PDF
4. Goods Receipt PDF
5. E-Way Bill PDF
6. Reports PDF

Each takes ~1 hour (pattern proven).

---

## Phase 4: Integration Testing

Test all 7 PDFs across:
- Company branding changes
- Branch overrides
- Document template toggles
- Historical regeneration

---

## Completed When

```
User can:

1. Configure company branding (UI)
2. Override branding per branch (UI)
3. Toggle branding elements per document type (UI)
4. Generate Invoice/PO/Quotation/etc PDFs (API)
5. Regenerate old PDFs with original branding (API)
6. See live preview before downloading (UI)

All working.

All via UI (not SQL).

All with snapshots.

All with checksums.
```

---

## Do NOT Start Phase 2 Until

- ✅ Phase 1 manual tests pass
- ✅ All 3 test scenarios confirm historical regeneration works

---

## Next Step

If Phase 1 tests pass:

**Start Phase 2 Step 1 (Company Tab).**

Build it.

Test it.

Move to Step 2.

Do not skip steps.
Do not do all tabs at once.

Sequential.

One tab at a time.

The Preview tab is the de-risking step.
Everything depends on it working perfectly.

---

## No More Documents After This

This is the last planning document.

The next artifacts:
- Working UI
- Working PDFs
- Working snapshots
- Working historical regeneration

All proven through execution.

Not through more documents.
