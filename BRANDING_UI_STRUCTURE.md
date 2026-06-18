# Branding UI Structure

## Status: SKETCH (Not Implemented)

Do **NOT** code until Phase 1B manual tests pass.

This is a structural guide for implementation after Invoice PDF testing proves the backend works.

---

## Navigation

```
Settings
└── Branding
    ├── Tab 1: Company
    ├── Tab 2: Assets
    ├── Tab 3: Document Templates
    ├── Tab 4: Branch Overrides
    └── Tab 5: Preview
```

---

## Tab 1: Company Information

### Status Indicator (Top-Right)

```
Branding Status

● Complete          (all required fields filled)

or

⚠ Missing Logo      (specific issue)

or

⚠ Missing GST       (specific issue)

or

⚠ Branch Overrides Pending
```

Helps users answer: "Can I generate professional PDFs?"

---

### Form Fields

```
Company Name              [text input]
Legal Name               [text input]
GST Number               [text input]
PAN Number               [text input]
Address                  [textarea]
Phone                    [text input]
Email                    [email input]
Website                  [text input]
Footer Text              [textarea]

---

Theme

Primary Color            [ Color Picker ]
Secondary Color          [ Color Picker ]
Accent Color             [ Color Picker ]

[Save]
```

### API Contract

```typescript
GET /branding/company
Response: {
  companyName: string
  legalName: string
  gstNumber: string
  panNumber: string
  address: string
  phone: string
  email: string
  website: string
  footerText: string
  theme: {
    primaryColor: string (hex)
    secondaryColor: string (hex)
    accentColor: string (hex)
  }
}

PUT /branding/company
Request: { ... same fields ... }
Response: { success: boolean }
```

### Notes
- All fields optional except companyName
- Updates affect all new documents immediately
- Old documents keep their snapshots (historical accuracy)

---

## Tab 2: Assets

### Logo Upload

```
Logo

[Current Logo Preview]    (if exists)

[Upload Logo]             (button)
[Delete Logo]             (button)

File: *.jpg, *.png (max 5MB)
```

### Signature Upload

```
Signature

[Current Signature Preview]    (if exists)

[Upload Signature]
[Delete Signature]

File: *.jpg, *.png (max 2MB)
```

### Seal Upload

```
Seal

[Current Seal Preview]    (if exists)

[Upload Seal]
[Delete Seal]

File: *.jpg, *.png (max 2MB)
```

### Save Button

```
[Save Assets]
```

### API Contract

```typescript
POST /branding/assets/logo
Request: FormData { file: File }
Response: { url: string, checksum: string }

POST /branding/assets/signature
Request: FormData { file: File }
Response: { url: string, checksum: string }

POST /branding/assets/seal
Request: FormData { file: File }
Response: { url: string, checksum: string }

DELETE /branding/assets/logo
Response: { success: boolean }

DELETE /branding/assets/signature
Response: { success: boolean }

DELETE /branding/assets/seal
Response: { success: boolean }

GET /branding/assets
Response: {
  logo: { url: string, uploadedAt: timestamp }
  signature: { url: string, uploadedAt: timestamp }
  seal: { url: string, uploadedAt: timestamp }
}
```

### Notes
- Assets are stored in StorageService (already implemented)
- URLs returned can be embedded in PDFs
- Deleting asset does NOT affect existing snapshots

---

## Tab 3: Document Templates

### Structure

For each document type, show toggles with icons for visual scanning:

```
📄 Invoice

☑ Show Logo
☑ Show GST
☑ Show Address
☑ Show Footer
☑ Show Signature
☐ Show Seal

[Save]
```

```
📦 Purchase Order

☑ Show Logo
☑ Show GST
☑ Show Address
☑ Show Footer
☐ Show Signature
☐ Show Seal

[Save]
```

```
💬 Quotation

☑ Show Logo
☑ Show GST
☑ Show Address
☑ Show Footer
☑ Show Signature
☐ Show Seal

[Save]
```

```
🚚 Goods Issue

☑ Show Logo
☑ Show GST
☐ Show Address
☑ Show Footer
☐ Show Signature
☐ Show Seal

[Save]
```

```
📥 Goods Receipt

☑ Show Logo
☑ Show GST
☐ Show Address
☑ Show Footer
☐ Show Signature
☐ Show Seal

[Save]
```

```
🧾 Delivery Challan

☑ Show Logo
☑ Show GST
☑ Show Address
☑ Show Footer
☐ Show Signature
☐ Show Seal

[Save]
```

### API Contract

```typescript
GET /branding/document/INVOICE
Response: {
  documentType: "INVOICE"
  settings: {
    showLogo: boolean
    showGST: boolean
    showAddress: boolean
    showFooter: boolean
    showSignature: boolean
    showSeal: boolean
  }
}

PUT /branding/document/INVOICE
Request: {
  settings: { ... }
}
Response: { success: boolean }

// Same for all other document types
GET /branding/document/PURCHASE_ORDER
PUT /branding/document/PURCHASE_ORDER

GET /branding/document/QUOTATION
PUT /branding/document/QUOTATION

// etc.
```

### Notes
- Maps directly to `document_branding.settings_json` in database
- Changes apply to new documents only
- Old documents keep their original settings (snapshots)

---

## Tab 4: Branch Overrides

### Structure

```
Branch Selection
[Dropdown: HQ Chennai, Branch Mumbai, Branch Delhi, ...]

Branch: HQ Chennai

Branding Strategy

(⦿) Use Company Branding
( ) Custom Branding

---

If "Custom Branding" selected:

Logo Override
[Upload Logo]
[Preview]

Footer Override
[Text Input]

Address Override
[Textarea]

Phone Override
[Text Input]

Email Override
[Email Input]

[Save Overrides]

---

If "Use Company Branding" selected:
(fields hidden)
"This branch uses company-wide branding"
```

### API Contract

```typescript
GET /branding/branches
Response: [
  {
    id: string
    shopId: string
    branchName: string
    overrideEnabled: boolean
    brandingOverride: {
      logoUrl?: string
      footerText?: string
      address?: string
      phone?: string
      email?: string
    }
  }
]

PUT /branding/branches/:shopId
Request: {
  overrideEnabled: boolean
  brandingOverride: { ... }
}
Response: { success: boolean }
```

### Notes
- Only applies to documents generated at that branch
- If disabled, branch uses company branding
- Overrides create new snapshots (fall back to company if field not overridden)

---

## Tab 5: Preview ⭐ CRITICAL

### Structure

```
Document Type Selection

[ Invoice ]  [ PO ]  [ Quotation ]  [ Goods Issue ]  [ Goods Receipt ]

---

View Options

[ Desktop ]  [ Mobile ]  [ Print ]

Zoom: [ 50% ]  [ 75% ]  [ 100% ]

---

Live Preview Area

[Embedded PDF Preview or HTML Render]

Shows:
- Logo (if enabled)
- Company name
- GST (if enabled)
- Address (if enabled)
- Footer (if enabled)
- Signature (if enabled)
- Seal (if enabled)
- Theme colors applied

---

Download Section

[ Download Sample Invoice PDF ]

```

### Behavior

- **Real-time updates**: When user changes logo, footer, or toggles settings, preview updates instantly
- **No page refresh needed**
- **Shows exactly what users will see** when they generate actual PDFs
- **Fast and stateless**: Rendered in browser, not server

### Preview API (HTML Only)

```typescript
POST /branding/preview
Request: {
  documentType: "INVOICE"
  viewMode: "desktop" | "mobile" | "print"
  zoom: 50 | 75 | 100
  overrides?: {
    logoUrl?: string
    footerText?: string
    primaryColor?: string
    // other overrides
  }
}
Response: {
  html: string
  css: string
}
```

Render via:
- `<iframe srcdoc={html}>`
- or `dangerouslySetInnerHTML`
- or HTML preview component

### Sample PDF API (Separate)

```typescript
POST /branding/sample-pdf
Request: {
  documentType: "INVOICE"
  overrides?: { ... }
}
Response: {
  pdf: Buffer (downloadable)
}
```

Button:
```
[ Download Sample PDF ]
```

### Design Rationale

- **Preview**: Fast, stateless, real-time (HTML only)
- **PDF**: Explicit action, slower, server-side (PDF generation)
- Better UX: Preview instant feedback, PDF on demand
- Prevents: Sluggish UI from PDF generation on every keystroke

---

## Card: Branding Health (Top of Tab 1)

```
Branding Completeness

████████░░  85%

✓ Logo Uploaded
✓ Company Info Complete
✓ GST Number Set
✓ Footer Text Set
✗ Signature Not Uploaded
✗ Branch Overrides Not Configured
```

### Calculation

```
Score = (completed_fields / total_fields) * 100

Completed:
  - companyName ✓
  - gstNumber ✓
  - logoUrl ✓
  - footerText ✓

Not completed:
  - signatureUrl ✗
  - sealUrl ✗
  - branchOverrides ✗

85% = 5/6 fields
```

### Purpose
- Quick visual indicator of branding setup completeness
- Users know what's missing

---

## Not Building (Yet)

❌ Branding History UI (snapshots + audit logs already capture it)
❌ Snapshot Viewer (for technical debugging)
❌ Branding Comparison (old vs new)
❌ Theme Marketplace
❌ Watermark Editor
❌ Version Rollback
❌ A/B Testing UI

These can be added later if users request them.

---

## Data Flow

### Generating a PDF

```
User clicks "Generate Invoice PDF"

↓

API: GET /invoices/{id}/pdf

↓

InvoicePdfService.generatePdf()

  ↓
  
  invoice.brandingSnapshot exists?
  
    YES
      ↓
      Use snapshot (historical)
    
    NO
      ↓
      BrandingService.createBrandingSnapshot()
        ↓
        Load current company branding (from UI configuration)
        ↓
        Load branch overrides (if applicable)
        ↓
        Create snapshot with checksum
      ↓
      Persist snapshot to invoice_headers.branding_snapshot

  ↓
  
  PdfBrandingAdapter.applyAllBranding(html, snapshot)
  
  ↓
  
  Render to PDF

↓

Return PDF
```

### Changing Company Branding

```
User updates Company tab or Assets tab

↓

API: PUT /branding/company or POST /branding/assets/logo

↓

Update database (company.branding_profile)

↓

Invalidate Redis cache (BrandingService.invalidateCompanyCache)

↓

Next PDF generation uses new branding

↓

But old PDFs regenerate with original branding (snapshots)
```

---

## Implementation Notes

1. **Do NOT implement until Phase 1B manual tests pass**
2. **All APIs already designed in backend**
3. **Frontend is just a form layer**
4. **No complex business logic needed**
5. **Preview tab is the only "smart" component** (real-time updates)

---

## Files Involved (Backend - Already Exist)

- `BrandingService.ts` - Core logic
- `DocumentBrandingService.ts` - Document settings
- `BrandingProfileService.ts` - Company info
- `StorageService.ts` - Asset upload/storage
- `PdfBrandingAdapter.ts` - Preview rendering
- `InvoicePdfService.ts` - PDF generation flow

---

## Ready for Implementation

After Invoice manual tests pass:

```
1. Create React components for each tab
2. Call APIs (already implemented)
3. Handle form state
4. Add real-time preview
5. Test with actual branding changes
```

No backend changes needed. UI is just a form layer over existing APIs.
