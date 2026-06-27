# Invoice Fixture Schema - v1.1

## Line Item Structure (Canonical)

Every line item MUST follow this exact structure. No duplicate keys.

```json
{
  "slNo": 1,
  "sku": "SKU-001",
  "description": "Product description",
  "hsnCode": "8479.89",
  "quantity": 2,
  "uom": "PCS",
  "unitPrice": 50000.00,

  // Base calculation (before discount)
  "baseAmount": 100000.00,

  // Discount (if any)
  "discountAmount": 0.00,

  // After discount, before tax
  "taxableAmount": 100000.00,

  // Tax breakdown
  "taxRate": 18,
  "cgstRate": 9,
  "cgstAmount": 9000.00,
  "sgstRate": 9,
  "sgstAmount": 9000.00,
  "igstRate": 0,
  "igstAmount": 0,

  // Final amount with tax
  "grossAmount": 118000.00
}
```

### Field Definitions

| Field | Meaning | Formula |
|-------|---------|---------|
| `baseAmount` | quantity × unitPrice | qty × rate |
| `discountAmount` | line-level discount | given or 0 |
| `taxableAmount` | baseAmount - discountAmount | base - disc |
| `taxRate` | total GST rate (0, 5, 12, 18) | CGST + SGST |
| `cgstAmount` | Central GST | taxable × (cgstRate / 100) |
| `sgstAmount` | State GST | taxable × (sgstRate / 100) |
| `igstAmount` | Integrated GST | taxable × (igstRate / 100) |
| `grossAmount` | taxableAmount + all taxes | taxable + tax |

### Rules

- ✓ One description per item (no duplication)
- ✓ One quantity per item (no duplication)
- ✓ One discount per item (no duplication)
- ✓ taxableAmount = baseAmount - discountAmount
- ✓ grossAmount = taxableAmount + (cgstAmount + sgstAmount + igstAmount)
- ✓ No "lineTotal" field (ambiguous, use "grossAmount" instead)

---

## Invoice Summary Structure

```json
{
  "summary": {
    "subtotal": 1000000.00,
    "discountAmount": 5000.00,
    "taxableAmount": 995000.00,
    "cgstAmount": 89550.00,
    "sgstAmount": 89550.00,
    "igstAmount": 0.00,
    "totalTax": 179100.00,
    "grossTotal": 1174100.00
  }
}
```

### Summary Calculation

```text
subtotal = SUM(baseAmount for all items)
discountAmount = SUM(discountAmount for all items)
taxableAmount = subtotal - discountAmount
cgstAmount = SUM(cgstAmount for all items)
sgstAmount = SUM(sgstAmount for all items)
igstAmount = SUM(igstAmount for all items)
totalTax = cgstAmount + sgstAmount + igstAmount
grossTotal = taxableAmount + totalTax
```

---

## Invoice Header Structure

```json
{
  "invoiceType": "TAX_INVOICE",
  "invoiceNumber": "INV-2026-00001",
  "invoiceDate": "2026-06-20",
  "dueDate": "2026-07-20",
  "currency": "INR",
  
  "company": {
    "name": "Company Name",
    "address": "Full address",
    "gstin": "18AABCU5055K1ZA",
    "pan": "AABCS1234F",
    "phone": "+91-080-4100-1234",
    "email": "accounts@company.com"
  },
  
  "customer": {
    "name": "Customer Name",
    "address": "Full address",
    "gstin": "27AABCT1234H1Z5",
    "pan": "AAACT5678G",
    "phone": "+91-022-1234-5678",
    "email": "procurement@customer.com"
  },
  
  "supplyDetails": {
    "placeOfSupply": "Maharashtra",
    "stateCode": "27",
    "reverseChargeApplicable": false
  },
  
  "bankDetails": {
    "accountName": "Company Name",
    "accountNumber": "00012345678901",
    "ifsc": "HDFC0001234",
    "bankName": "HDFC Bank Limited",
    "branch": "Branch Name"
  },
  
  "paymentTerms": "Net 30 days from invoice date",
  
  "termsAndConditions": [
    "Goods once sold cannot be returned",
    "Subject to Bangalore jurisdiction",
    "Payment must be received within 30 days"
  ],
  
  "authorizedSignatory": {
    "name": "System Generated",
    "designation": "Authorized Signatory"
  },
  
  "remarks": "Thank you for your business"
}
```

### Invoice Type Values

- `TAX_INVOICE` - Regular GST invoice
- `PROFORMA` - Pre-invoice, not for payment
- `CREDIT_NOTE` - Reduces customer liability
- `DEBIT_NOTE` - Increases customer liability

---

## Rendering Metrics (for Gate 3)

```json
{
  "renderingMetrics": {
    "templateVersion": "v1.1",
    "chromeVersion": "138.0",
    "renderTimeMs": 1200,
    "pdfSizeBytes": 450000,
    "pageCount": 1,
    "pageBreakCount": 0,
    "maxRowHeightPx": 24,
    "peakMemoryMb": 156
  }
}
```

### Metrics Definitions

| Metric | Unit | Purpose |
|--------|------|---------|
| `templateVersion` | string | Track template changes |
| `chromeVersion` | string | Reproduce rendering issues |
| `renderTimeMs` | milliseconds | Performance tracking |
| `pdfSizeBytes` | bytes | Compression efficiency |
| `pageCount` | integer | Multi-page detection |
| `pageBreakCount` | integer | Break frequency (5-10 for 150 items) |
| `maxRowHeightPx` | pixels | Layout overflow detection |
| `peakMemoryMb` | megabytes | Resource usage |

---

## Verification Model: Three-Way Reconciliation

### Gate 1: Fixture Internal Consistency

```
Line Item Totals (calculate from base/discount/tax)
↓
Summary Totals (SUM of line totals)
↓
MUST MATCH
```

### Gate 2: Database ↔ ViewModel ↔ PDF

```
Database Record (actual invoice in DB)
↓
ViewModel (calculated from DB)
↓
PDF Rendering (extracted from PDF)
↓
ALL THREE MUST MATCH
```

---

## No Synthetic Multipliers

❌ DO NOT:
```json
{
  "lineItems": [{ "sku": "SKU-001" }],
  "lineItemsNote": "This represents 1 of 150 items..."
}
```

✅ DO:
```json
{
  "lineItems": [
    { "sku": "SKU-001", ... },
    { "sku": "SKU-002", ... },
    ...
    { "sku": "SKU-150", ... }
  ]
}
```

Gate 3 requires real rows, not mathematical abstractions.
