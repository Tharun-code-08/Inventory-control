# Invoice PDF v1.1 - Calculation Order (FROZEN)

**Document Date:** 2026-06-20  
**Status:** FROZEN - Immutable calculation sequence  
**Scope:** All Invoice PDF line items and totals  

---

## Why This Matters

When auditors ask five years later:

> "Why is this invoice ₹0.02 different from our export?"

You will point to this document and show the exact sequence.

This prevents:
- Silent rounding changes
- Accidental formula changes
- Disputes about "what the system did"
- Inability to regenerate old invoices

---

## Line Item Calculation Order (FROZEN)

**For each line item, in this exact sequence:**

```
Step 1: baseAmount
─────────────────
baseAmount = quantity × unitPrice

ROUND to 2 decimals using HALF_UP.

Example:
  quantity = 2.5
  unitPrice = 9999.99
  baseAmount = ROUND(2.5 × 9999.99, 2) = 24999.98

Purpose: Gross amount before any reductions.
Must calculate: Even if discount is 100%.
```

---

```
Step 2: discountAmount
──────────────────────
discountAmount = [given in fixture] OR 0

ROUND to 2 decimals using HALF_UP if calculated.

Example:
  Given in fixture: 37.45
  discountAmount = 37.45

Purpose: Line-level discount (if any).
Must not: Affect baseAmount.
Must record: Even if zero.
```

---

```
Step 3: taxableAmount
─────────────────────
taxableAmount = baseAmount - discountAmount

ROUND to 2 decimals using HALF_UP.

Example:
  baseAmount = 24999.98
  discountAmount = 37.45
  taxableAmount = ROUND(24999.98 - 37.45, 2) = 24962.53

Purpose: Amount subject to GST.
Must calculate: For every line item.
Must be positive: If discount > baseAmount, error.
```

---

```
Step 4: cgstAmount
──────────────────
cgstAmount = taxableAmount × (cgstRate / 100)

ROUND to 2 decimals using HALF_UP.

Example:
  taxableAmount = 24962.53
  cgstRate = 9
  cgstAmount = ROUND(24962.53 × 0.09, 2) = 2246.63

Purpose: Central GST component.
Must calculate: For every line (even if rate is 0%).
Must be independent: Of SGST/IGST calculations.
```

---

```
Step 5: sgstAmount
──────────────────
sgstAmount = taxableAmount × (sgstRate / 100)

ROUND to 2 decimals using HALF_UP.

Example:
  taxableAmount = 24962.53
  sgstRate = 9
  sgstAmount = ROUND(24962.53 × 0.09, 2) = 2246.63

Purpose: State GST component.
Must calculate: For every line (even if rate is 0%).
Must be independent: Of CGST/IGST calculations.
```

---

```
Step 6: igstAmount
──────────────────
igstAmount = taxableAmount × (igstRate / 100)

ROUND to 2 decimals using HALF_UP.

Example:
  taxableAmount = 24962.53
  igstRate = 0
  igstAmount = ROUND(24962.53 × 0, 2) = 0.00

Purpose: Integrated GST component (inter-state).
Must calculate: For every line (even if rate is 0%).
Must be independent: Of CGST/SGST calculations.
```

---

```
Step 7: grossAmount
────────────────────
grossAmount = taxableAmount + cgstAmount + sgstAmount + igstAmount

ROUND to 2 decimals using HALF_UP.

Example:
  taxableAmount = 24962.53
  cgstAmount = 2246.63
  sgstAmount = 2246.63
  igstAmount = 0.00
  grossAmount = ROUND(24962.53 + 2246.63 + 2246.63 + 0.00, 2)
              = ROUND(29455.79, 2)
              = 29455.79

Purpose: Final line item total (what customer pays for this line).
Must calculate: After all component taxes.
Must include: All tax components.
```

---

## Invoice Total Calculation Order (FROZEN)

**After all line items are calculated, calculate invoice totals in this sequence:**

```
Step 1: subtotal
────────────────
subtotal = SUM(baseAmount for all line items)

ROUND to 2 decimals using HALF_UP.

Example:
  Item 1 baseAmount: 24999.98
  Item 2 baseAmount: 50000.00
  Item 3 baseAmount: 10000.00
  subtotal = ROUND(24999.98 + 50000.00 + 10000.00, 2)
           = ROUND(84999.98, 2)
           = 84999.98

Purpose: Gross value of all items before discount.
Must include: All line items, unrounded.
```

---

```
Step 2: totalDiscountAmount
────────────────────────────
totalDiscountAmount = SUM(discountAmount for all line items)

ROUND to 2 decimals using HALF_UP.

Example:
  Item 1 discount: 0.00
  Item 2 discount: 5000.00
  Item 3 discount: 37.45
  totalDiscountAmount = ROUND(0.00 + 5000.00 + 37.45, 2)
                      = ROUND(5037.45, 2)
                      = 5037.45

Purpose: Total discounts across all lines.
Must include: All line-level discounts.
```

---

```
Step 3: totalTaxableAmount
───────────────────────────
totalTaxableAmount = subtotal - totalDiscountAmount

ROUND to 2 decimals using HALF_UP.

Example:
  subtotal = 84999.98
  totalDiscountAmount = 5037.45
  totalTaxableAmount = ROUND(84999.98 - 5037.45, 2)
                     = ROUND(79962.53, 2)
                     = 79962.53

Purpose: Total amount subject to GST (for whole invoice).
Must equal: SUM(taxableAmount for all lines) within ±0.01
```

---

```
Step 4: totalCGSTAmount
────────────────────────
totalCGSTAmount = SUM(cgstAmount for all line items)

ROUND to 2 decimals using HALF_UP.

Example:
  Item 1 CGST: 2246.63
  Item 2 CGST: 4500.00
  Item 3 CGST: 0.00
  totalCGSTAmount = ROUND(2246.63 + 4500.00 + 0.00, 2)
                  = ROUND(6746.63, 2)
                  = 6746.63

Purpose: Total Central GST.
Must include: All line-level CGST amounts (sum, don't recalculate).
```

---

```
Step 5: totalSGSTAmount
────────────────────────
totalSGSTAmount = SUM(sgstAmount for all line items)

ROUND to 2 decimals using HALF_UP.

Example:
  Item 1 SGST: 2246.63
  Item 2 SGST: 4500.00
  Item 3 SGST: 0.00
  totalSGSTAmount = ROUND(2246.63 + 4500.00 + 0.00, 2)
                  = ROUND(6746.63, 2)
                  = 6746.63

Purpose: Total State GST.
Must include: All line-level SGST amounts (sum, don't recalculate).
```

---

```
Step 6: totalIGSTAmount
────────────────────────
totalIGSTAmount = SUM(igstAmount for all line items)

ROUND to 2 decimals using HALF_UP.

Example:
  Item 1 IGST: 0.00
  Item 2 IGST: 0.00
  Item 3 IGST: 0.00
  totalIGSTAmount = ROUND(0.00 + 0.00 + 0.00, 2)
                  = ROUND(0.00, 2)
                  = 0.00

Purpose: Total Integrated GST (for inter-state supplies).
Must include: All line-level IGST amounts (sum, don't recalculate).
```

---

```
Step 7: totalTaxAmount
───────────────────────
totalTaxAmount = totalCGSTAmount + totalSGSTAmount + totalIGSTAmount

ROUND to 2 decimals using HALF_UP.

Example:
  totalCGSTAmount = 6746.63
  totalSGSTAmount = 6746.63
  totalIGSTAmount = 0.00
  totalTaxAmount = ROUND(6746.63 + 6746.63 + 0.00, 2)
                 = ROUND(13493.26, 2)
                 = 13493.26

Purpose: Total tax across all components.
Must be: CGST + SGST + IGST (never calculate as % of taxable).
```

---

```
Step 8: grandTotal
───────────────────
grandTotal = totalTaxableAmount + totalTaxAmount

ROUND to 2 decimals using HALF_UP.

Example:
  totalTaxableAmount = 79962.53
  totalTaxAmount = 13493.26
  grandTotal = ROUND(79962.53 + 13493.26, 2)
             = ROUND(93455.79, 2)
             = 93455.79

Purpose: Final invoice total (what customer pays).
Must equal: SUM(grossAmount for all lines) within ±0.01
```

---

## Verification Checks (FROZEN)

After calculating, verify:

```
Check 1: Line item sum
─────────────────────
SUM(baseAmount) should equal subtotal (exact match)

Check 2: Discount sum
─────────────────────
SUM(discountAmount) should equal totalDiscountAmount (exact match)

Check 3: Taxable sum
────────────────────
SUM(taxableAmount) should equal totalTaxableAmount (within ±0.01)
(tolerance due to rounding)

Check 4: CGST sum
─────────────────
SUM(cgstAmount) should equal totalCGSTAmount (within ±0.01)

Check 5: SGST sum
─────────────────
SUM(sgstAmount) should equal totalSGSTAmount (within ±0.01)

Check 6: IGST sum
─────────────────
SUM(igstAmount) should equal totalIGSTAmount (within ±0.01)

Check 7: Gross sum
──────────────────
SUM(grossAmount) should equal grandTotal (within ±0.01)

If any check fails:
  STOP
  Investigate
  Fix root cause
  Regenerate
```

---

## Never (FROZEN)

These practices are forbidden:

1. ❌ **Calculate tax on grossAmount** - Always on taxableAmount
2. ❌ **Round before summing** - Sum first, then round
3. ❌ **Different precision for different fields** - All money: 2 decimals
4. ❌ **Skip steps** - Follow order exactly
5. ❌ **Recalculate totals as percentages** - Always sum line items
6. ❌ **Allow CGST ≠ SGST when both should apply** - They're independent

---

## This Document is FROZEN

No changes without:
1. Executive approval
2. Audit trail
3. Regeneration of all affected invoices
4. Re-verification of all totals

**Because:** Changing calculation order retroactively is fraud.

---

**Calculation Order Locked. Ready for PDF generation.**
