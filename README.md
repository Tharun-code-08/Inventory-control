# Invoice PDF v1.1

Four PDFs ready for visual validation:

- `invoice-small.pdf` — Basic (5 items, ₹2.92L)
- `invoice-legal.pdf` — Multiple tax rates (6 items, ₹26L, 3 rates)
- `invoice-overflow.pdf` — Extreme fields (80+ char names, 196-char description)
- `invoice-overflow-unicode.pdf` — Tamil, Telugu, Kannada, Chinese, Japanese

## Open them. Judge them.

1. Can you understand invoice-small in 10 seconds?
2. Can you verify invoice-legal taxes without a calculator?
3. Do invoice-overflow and invoice-overflow-unicode render without clipping/boxes?

If yes to all three: **Presentation v1.1 is frozen.**

If no: Fix and regenerate.

## Code

- `validate-invoice-viewmodel.js` — Rule 0 validator (simplified)
- Fixtures in `invoices/` directory (4 PDFs)
- Generators in `/tmp/` for reference

## That's it.

The rest is visual inspection. You know what to do.
