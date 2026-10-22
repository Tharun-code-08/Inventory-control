# Changelog

Notable changes to SoftdigitIMS. Every merge to `main` is deployed to production, so
entries are grouped by date and link to the pull request that shipped them.

## 2026-10-22

### Added
- Accounts go **read-only** once a paid plan lapses (after a 3-day grace period) or a
  trial ends; reads, billing, exports and backups keep working ([#109]).
- Confirming a purchase order requires the `purchase_order:approve` permission ([#109]).
- Supplier portal uses **signed per-invite links**; suppliers request a fresh link by
  email instead of signing in with an email address alone ([#112]).

### Changed
- Upgrade payments are tied to the organisation when checkout starts and are applied
  from the Razorpay webhook if the tab closes after paying ([#112]).
- Document numbers are unique per organisation instead of across all tenants, so a new
  organisation's first SO, invoice or PO no longer collides; invoices, receipts and
  credit notes follow the configured number series ([#112]).
- E-way bills record the EWB number issued by the GST portal instead of generating a
  placeholder; drafts are clearly marked as not valid for movement ([#112]).
- Sender SMTP passwords use a dedicated `SMTP_CREDENTIALS_KEY` and are re-encrypted on
  boot ([#112]).
- Request bodies are capped at 2 MB (50 MB for bulk imports); oversized or malformed
  bodies return 413/400 instead of 500 ([#109]).
- Upgraded bullmq to 6 (recurring jobs moved to job schedulers) ([#111]) and zod to 4 with
  @hookform/resolvers 5 ([#110]).

## 2026-10-19 – 2026-10-21 — full-project audit fixes

A full audit of the codebase was fixed in batches ([#90]–[#108]):

- **Security and tenant isolation:** company-scoped admin settings, approvals, references
  and PDFs; MFA and login hardening; request-context and throttling fixes; e-way bill PDF
  injection; AI assistant quotas and approval safety; log hygiene.
- **Inventory:** costing, inventory exceptions, alerts, imports, lots and expiry flags.
- **Procurement:** PO receipt limits, RFQ and contract lifecycle, approvals.
- **Sales:** returns validation, concurrency guards, GST split, shop checks.
- **Billing and reports:** renewals keep remaining paid time, subscription invoice
  numbering, report totals, platform KPIs, dunning dispatch reliability.
- **Web:** PO list filters across all pages, per-line taxes, safe create-then-post,
  local dates, lists that load every page.
- **Mobile:** sign-out, forgot password, search reset, list paging, INR formatting,
  push notification handling, no cleartext HTTP in production builds.
- **Infrastructure:** deploys ship the exact commit that passed CI and roll back to the
  live release; point-in-time restore and WAL archiving fixes; ops scripts on Prisma 7.

## 2026-10-18

### Changed
- Upgraded the API to **Prisma 7** and NestJS 12, the web app to **React 19, Vite 8,
  Tailwind CSS 4** and Vitest 5, Puppeteer to 25 and undici to 8; CI and production run
  Node 22 LTS.
- Signup requires and records Terms/Privacy consent.
- Fork pull requests can no longer trigger the production deploy.

### Fixed
- Tenant row-level-security context now actually applies to queries.
- Enum columns that migrations had created as text are converted.
- Approvals are scoped to the caller's company; e-way bills require `shop:write`.
- Constant-time Razorpay signature checks; Swagger disabled in production by default.

[#90]: https://github.com/Tharun-code-08/Inventory-control/pull/90
[#108]: https://github.com/Tharun-code-08/Inventory-control/pull/108
[#109]: https://github.com/Tharun-code-08/Inventory-control/pull/109
[#110]: https://github.com/Tharun-code-08/Inventory-control/pull/110
[#111]: https://github.com/Tharun-code-08/Inventory-control/pull/111
[#112]: https://github.com/Tharun-code-08/Inventory-control/pull/112
