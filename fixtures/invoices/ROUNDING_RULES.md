# Invoice PDF v1.1 - Rounding Rules (FROZEN)

**Document Date:** 2026-06-20  
**Status:** FROZEN - No changes without audit trail  
**Scope:** All Invoice PDF calculations  

---

## Why This Matters

Many accounting disputes arise from:

```
Σ(round(line_tax))  ≠  round(Σ(line_tax))
```

Example:
```
Item 1: tax = 10.004 → rounds to 10.00
Item 2: tax = 10.005 → rounds to 10.01
Sum of rounded: 20.01

vs

Sum first: 20.009 → rounds to 20.01

Same result by accident, but not always guaranteed.
```

This document defines the rule **once** and makes it immutable.

---

## Precision Rules (FROZEN)

### Input Precision

| Field | Decimals | Example | Rule |
|-------|----------|---------|------|
| `quantity` | Up to 4 | 2.5000 | Accept as-is |
| `unitPrice` | Up to 2 | 9999.99 | Accept as-is |
| `discountAmount` | Up to 2 | 37.45 | Accept as-is |
| `taxRate` | Up to 2 | 18.00 | Accept as-is |

### Output Precision

All monetary amounts displayed: **exactly 2 decimals**

Examples:
- ✅ ₹100.00
- ✅ ₹1,234.56
- ❌ ₹100 (missing decimals)
- ❌ ₹100.005 (too many decimals)

---

## Calculation Sequence (FROZEN)

**For each line item:**

```
1. baseAmount = ROUND(quantity × unitPrice, 2)
   Example: ROUND(2.5 × 9999.99, 2) = ROUND(24999.975, 2) = 24999.98

2. discountAmount = given value, ROUND to 2
   Example: 37.45 (already given)

3. taxableAmount = ROUND(baseAmount - discountAmount, 2)
   Example: ROUND(24999.98 - 37.45, 2) = ROUND(24962.53, 2) = 24962.53

4. cgstAmount = ROUND(taxableAmount × (cgstRate / 100), 2)
   Example: ROUND(24962.53 × 0.09, 2) = ROUND(2246.6277, 2) = 2246.63

5. sgstAmount = ROUND(taxableAmount × (sgstRate / 100), 2)
   Example: ROUND(24962.53 × 0.09, 2) = ROUND(2246.6277, 2) = 2246.63

6. igstAmount = ROUND(taxableAmount × (igstRate / 100), 2)
   Example: ROUND(24962.53 × 0, 2) = 0.00

7. grossAmount = ROUND(taxableAmount + cgstAmount + sgstAmount + igstAmount, 2)
   Example: ROUND(24962.53 + 2246.63 + 2246.63 + 0, 2) = 29455.79
```

**For invoice totals (after all line items):**

```
1. subtotal = ROUND(SUM(baseAmount for all items), 2)

2. totalDiscountAmount = ROUND(SUM(discountAmount for all items), 2)

3. totalTaxableAmount = ROUND(subtotal - totalDiscountAmount, 2)

4. totalCGSTAmount = ROUND(SUM(cgstAmount for all items), 2)

5. totalSGSTAmount = ROUND(SUM(sgstAmount for all items), 2)

6. totalIGSTAmount = ROUND(SUM(igstAmount for all items), 2)

7. totalTaxAmount = ROUND(totalCGSTAmount + totalSGSTAmount + totalIGSTAmount, 2)

8. grandTotal = ROUND(totalTaxableAmount + totalTaxAmount, 2)
```

**Critical rule:** Round **after each calculation**, not just at the end.

---

## Rounding Mode (FROZEN)

**Standard:** HALF_UP (also called "round half away from zero")

```
Value        Rounds To
10.124       10.12
10.125       10.13  ← half rounds up
10.126       10.13
```

**Reason:** Standard in Indian commerce and accounting (GST compliance)

**Not:** BANKER's ROUNDING (round half to even)
- That would be: 10.125 → 10.12 (controversial)

**Not:** TRUNCATE
- That would be: 10.129 → 10.12 (loses precision)

**Implementation:**
```javascript
function round(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
```

This is HALF_UP in JavaScript.

---

## Line Item Totals: Line-by-Line (FROZEN)

**Rule:** Tax is calculated and rounded **per line item**, not aggregated then rounded.

**Why:**
- Matches how GST invoices are displayed
- Each line is independently verifiable
- Matches fixture structure

**Verification:**
```
For each line i:
  1. Calculate: lineGrossi = taxablei + (cgsti + sgsti + igsti)
  2. Verify: SUM(lineGross) should approximately equal grandTotal
  3. Rounding tolerance: ±0.01 (one paisa)
```

---

## Rounding Tolerance: ±0.01 (FROZEN)

When comparing totals (Database vs ViewModel vs PDF):

```
Acceptable: |DB_total - VM_total| ≤ 0.01

Acceptable: |VM_total - PDF_total| ≤ 0.01

Not Acceptable: |DB_total - VM_total| > 0.01
```

**Why ±0.01?**
- Floating-point arithmetic accumulates tiny errors
- With 500+ line items, errors can reach ₹0.05-0.10
- ±0.01 catches real bugs (wrong formula) while tolerating computational rounding

**If tolerance exceeded:**
```
STOP

Investigate:
  - Wrong formula?
  - Wrong rounding mode?
  - Wrong precision?
  - Calculation order wrong?

Fix root cause.

Never "adjust" totals.
```

---

## Three-Way Verification (FROZEN)

When validating Gate 1:

```
Database totals
  ↓ extract via SQL SUM
  
Should match within ±0.01

ViewModel totals
  ↓ calculated from fixture JSON

Should match within ±0.01

PDF totals
  ↓ extracted from rendered PDF text
```

**Pass:** All three match (within tolerance)

**Fail:** Any mismatch > ±0.01

---

## Rounding Audit Trail (FROZEN)

Every PDF should include:

```json
"renderingMetrics": {
  "templateVersion": "v1.1",
  "roundingMode": "HALF_UP",
  "roundingPrecision": 2,
  "toleranceRupees": 0.01
}
```

This allows auditors to:
- Verify consistent rounding across all documents
- Reproduce calculations
- Detect if rounding rules changed silently

---

## Examples: Correct vs Incorrect

### Example 1: Line Item Tax

**Correct:**
```
quantity: 2.5
unitPrice: 9999.99
taxRate: 18%
cgstRate: 9%

1. baseAmount = ROUND(2.5 × 9999.99, 2) = 24999.98
2. taxableAmount = 24999.98 (no discount)
3. cgstAmount = ROUND(24999.98 × 0.09, 2) = ROUND(2249.998, 2) = 2250.00
4. grossAmount = ROUND(24999.98 + 2250.00 + 2250.00, 2) = 29499.98
```

**Incorrect (too early rounding):**
```
baseAmount = 2.5 × 9999.99 = 24999.975 (rounded too early)
```

---

### Example 2: Invoice Total with 500 Items

**Correct:**
```
Sum of 500 line items
  → each rounded individually
  → then SUM them
  → then round the final total
```

**Incorrect:**
```
Sum of 500 line items (unrounded)
  → then round once at the end
  (loses precision from intermediate items)
```

---

## Never (FROZEN)

These practices are forbidden:

1. ❌ **Fudging totals:** Never adjust grandTotal to "make math work"
2. ❌ **Silent rounding changes:** If rounding mode changes, it must be documented
3. ❌ **Rounding per-invoice, not per-line:** Line items must round independently
4. ❌ **Different precision for different fields:** All money fields: exactly 2 decimals
5. ❌ **Accepting rounding errors > ±0.01:** This indicates a real bug

---

## Audit Checklist (Next Session)

When validating Gate 1, verify:

- [ ] Every line item rounded independently (HALF_UP, 2 decimals)
- [ ] Invoice totals calculated after line items (not vice versa)
- [ ] Database == ViewModel == PDF (within ±0.01)
- [ ] No "fudged" totals
- [ ] Rounding mode documented
- [ ] Precision consistent across all fields

---

## This Document is FROZEN

No changes to rounding rules without:
1. Executive approval
2. Audit trail
3. Regeneration of all affected PDFs
4. Re-verification of all gate tests

**Reason:** Rounding rules are immutable once invoices are issued. Changing them retroactively is fraud.

---

**Rounding Rules Locked. Ready for PDF generation.**
