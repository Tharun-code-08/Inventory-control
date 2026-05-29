# Motion QA Checklist

Premium SaaS animation system — Sprint 4 validation targets and manual test plan.

## Performance targets

| Metric | Target | How to verify |
|--------|--------|---------------|
| Scroll FPS (desktop) | 60 | Chrome DevTools → Performance → record scroll on Home + Dashboard + PO list |
| Scroll FPS (mobile) | 50+ | Same on throttled CPU / mobile emulation |
| First interaction | <100ms | Motion must not block input; type in forms during route transitions |
| Route transition | ≤300ms perceived | Navigate between modules; skeleton → content should feel instant |
| CLS from animations | 0 | Lighthouse → avoid layout shift from reveals, badges, toasts |

## Accessibility

- [ ] `prefers-reduced-motion: reduce` disables shimmer, reveals, parallax, badge crossfade, toast slide, route progress
- [ ] Decorative motion uses `aria-hidden="true"` (SuccessCheckmark in toasts, hero glows, login blurs)
- [ ] Keyboard: Tab through login, command palette (↑↓ enter esc), create forms
- [ ] Screen reader: status badges expose `aria-label`; command palette has `aria-modal`

## Functional smoke tests

### Marketing (Home)
- [ ] Hero, features, pricing cards reveal on scroll (desktop)
- [ ] Parallax on hero image is subtle and disabled on mobile
- [ ] CTA buttons lift on hover; no click delay

### Master data creates (optimistic UI)
- [ ] **Customers** — create appears in list before refetch completes; rolls back on API error
- [ ] **Suppliers** — same
- [ ] **Products** — new row appears at top of page 1; rolls back on error
- [ ] Success toast shows animated checkmark; create card pulses once

### ERP workflows (no regressions)
- [ ] PO confirm/cancel — status badge crossfades
- [ ] Form save failure — data preserved + Retry toast (Customers)
- [ ] Pagination — PO + Products table body fades on page change
- [ ] Command palette — open animation, empty query hint, results crossfade

## Network / device matrix

- [ ] Slow 3G: skeletons show; motion still respects reduced-motion
- [ ] Low-end Android emulation: marketing parallax off; scroll remains usable
- [ ] Retry while error toast visible — second attempt works

## Known exceptions

- Marketing marquee pauses on hover; static fallback when reduced motion is on
- Product list optimistic row uses temporary id until server refetch
- Financial/stock mutations intentionally **not** optimistic (inventory accuracy)

## Sign-off

| Area | Status | Notes |
|------|--------|-------|
| Marketing | Manual | |
| Success effects | Manual | |
| Optimistic master data | Manual | |
| ERP regressions | Manual | |

_Last updated: Sprint 4 completion._
