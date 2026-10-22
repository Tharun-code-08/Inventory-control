# SoftdigitIMS

<p align="center">
  <strong>Inventory control and ERP for Indian retail and distribution businesses</strong><br />
  Procurement, warehouse stock, sales, GST documents, billing and automation in one multi-tenant platform —
  with a web app, a mobile warehouse app and a WhatsApp assistant.
</p>

<p align="center">
  <a href="https://github.com/Tharun-code-08/Inventory-control/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Tharun-code-08/Inventory-control/ci.yml?branch=main&label=CI&logo=github" alt="CI" /></a>
  <a href="https://github.com/Tharun-code-08/Inventory-control/actions/workflows/deploy.yml"><img src="https://img.shields.io/github/actions/workflow/status/Tharun-code-08/Inventory-control/deploy.yml?branch=main&label=deploy" alt="Deploy" /></a>
  <a href="https://github.com/Tharun-code-08/Inventory-control/actions/workflows/codeql.yml"><img src="https://img.shields.io/github/actions/workflow/status/Tharun-code-08/Inventory-control/codeql.yml?branch=main&label=CodeQL" alt="CodeQL" /></a>
  <img src="https://img.shields.io/badge/node-%E2%89%A522.19-339933?logo=node.js&logoColor=white" alt="Node 22.19+" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue" alt="License: AGPL-3.0" /></a>
</p>

<p align="center">
  <a href="#getting-started">Getting started</a> ·
  <a href="docs/README.md">Documentation</a> ·
  <a href="docs/DEPLOYMENT.md">Deployment</a> ·
  <a href="CONTRIBUTING.md">Contributing</a> ·
  <a href="SECURITY.md">Security</a> ·
  <a href="CHANGELOG.md">Changelog</a> ·
  <a href="LICENSE">License</a>
</p>

---

## Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Everyday commands](#everyday-commands)
- [Testing](#testing)
- [Deployment](#deployment)
- [Data integrity and security](#data-integrity-and-security)
- [Documentation](#documentation)
- [Contributing](#contributing)

## What it does

SoftdigitIMS runs the day-to-day operations of a business with one or more plants
(warehouses or shops). Each organisation's data is isolated from every other's.

| Area | Highlights |
| --- | --- |
| **Procurement** | Suppliers, RFQs with a supplier quote portal, bid comparison, contracts, purchase orders with approval, goods receipts, supplier bills and payments, supplier returns |
| **Inventory** | Stock ledger enforced in PostgreSQL, multi-plant stock and transfers, storage locations, batches/serials and expiry (FEFO), stock counts, damaged stock, inventory-health exceptions, low-stock and reorder alerts |
| **Sales** | Customers, sales quotations with a customer review portal, sales orders, goods issues, invoices, receipts, returns and credit notes |
| **GST** | CGST/SGST/IGST split, HSN codes, configurable document number series, e-way bill preparation (record the EWB number issued by the GST portal) |
| **Documents** | Branded PDF documents (invoices, POs, GRs, quotations, receipts, e-way bills), emailed from the organisation's own verified sender |
| **Reports** | Dashboard KPIs, stock movement, valuation, dead stock, reorder, profitability, Excel exports |
| **Billing** | Trial and paid plans (Razorpay), plan limits, renewals, dunning, subscription invoices; organisations go read-only after a plan lapses |
| **Automation** | Workflow engine, approvals, notifications (in-app, email, push), scheduled jobs on BullMQ |
| **WhatsApp assistant** | Linked WhatsApp numbers can look up stock and draft documents, with human approval before anything is posted |
| **Mobile** | Expo app for the warehouse floor: barcode scanning and printing, stock counts, goods receipts and issues, approvals, reports |
| **Platform** | Signup with verification, MFA (TOTP), role-based permissions, audit log, per-company backups (local, email, Google Drive) |

## Tech stack

| Layer | Technology |
| --- | --- |
| API | [NestJS](https://nestjs.com) 12, TypeScript, [Prisma](https://www.prisma.io) 7 (`@prisma/adapter-pg`) |
| Database | PostgreSQL 15+ with row-level security and stock triggers |
| Jobs and cache | Redis 7, [BullMQ](https://docs.bullmq.io) 6 |
| Web | React 19, Vite 8, Tailwind CSS 4, TanStack Query 5, React Hook Form + Zod 4 |
| Mobile | Expo 54, React Native 0.81, Expo Router |
| Documents | Puppeteer (headless Chromium) HTML-to-PDF |
| Payments | Razorpay (orders, signature and webhook verification) |
| Testing | Jest 30 (API unit + e2e), Vitest (web), Playwright (web e2e) |
| CI/CD | GitHub Actions → SSH deploy to a VPS running PM2 behind nginx |

The repository is an **npm workspaces** monorepo; `package-lock.json` at the root is the
single lockfile.

## Architecture

```text
 Web (React/Vite) ──┐
 Mobile (Expo) ─────┼──► REST API /api/v1 (NestJS) ──► PostgreSQL (Prisma, RLS, triggers)
 WhatsApp ──────────┘          │
                               ├──► Redis + BullMQ  (schedulers, email, exports, relays)
                               ├──► Puppeteer       (PDF documents)
                               └──► SMTP · Razorpay · Google Drive · push notifications
```

- Every request carries a company context; Postgres row-level security and service-level
  shop checks keep organisations apart.
- Stock balances are maintained by database triggers on the stock ledger, so a stock
  movement and its balance change commit together, and negative stock is rejected by the
  database.
- Background work (scheduled reminders, dunning, event relay, exports) runs on BullMQ
  job schedulers inside the API process.

## Repository layout

```text
.
├── apps/
│   ├── api/            NestJS API — src/modules/<domain>, prisma/ (schema, migrations, seed), test/ (e2e)
│   ├── web/            React web app — src/pages, src/components, src/hooks, e2e/ (Playwright)
│   └── mobile/         Expo warehouse app — app/ (routes), src/
├── packages/
│   └── shared-types/   Types shared by the API and clients
├── deploy/
│   ├── api/            Chromium dependencies for PDF rendering
│   ├── pm2/            PM2 process files (production, staging)
│   ├── postgres/       Backup, WAL archiving and restore scripts + systemd timers
│   └── web/            nginx config for the SPA
├── docker/             docker-compose for local Postgres + Redis, API Dockerfile
├── docs/               Deployment, runbook, backups, testing and design notes
├── fixtures/           PDF stress-test fixtures
├── scripts/            Setup, deploy, health and budget checks
└── .github/            CI workflows, Dependabot, CODEOWNERS, templates
```

## Getting started

### Prerequisites

- **Node.js 22.19+** and npm 10+
- **Docker** (for local PostgreSQL and Redis), or your own PostgreSQL 15+ and Redis 7
- For PDF generation on Linux servers: the Chromium system libraries in
  [deploy/api/README-pdf-chromium.md](deploy/api/README-pdf-chromium.md)

### 1. Install

```bash
git clone https://github.com/Tharun-code-08/Inventory-control.git
cd Inventory-control
npm install
```

### 2. Start PostgreSQL and Redis

```bash
npm run docker:deps          # Postgres on localhost:5433, Redis on localhost:6379
```

### 3. Configure the API

```bash
npm run setup:credentials    # creates apps/api/.env from .env.example with fresh secrets
```

The defaults in `apps/api/.env.example` match the docker-compose services, so a local
setup works without further edits. See [Configuration](#configuration) for mail,
payments and other integrations.

### 4. Create the database schema and seed data

```bash
cd apps/api
npx prisma migrate deploy
npm run db:seed              # creates a demo company, plant and owner account
cd ../..
```

The seed's owner login is `admin@retailims.com` / `Admin@123` (override with
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`; production requires an explicit password).

### 5. Run

```bash
npm run dev                  # API on http://localhost:3000, web on http://localhost:5173
npm run dev:mobile           # Expo dev server for the mobile app
```

API docs (Swagger) are at <http://localhost:3000/api/docs>; every route is under `/api/v1`.

> **Windows:** `npm run setup:new-machine` runs `scripts/setup-new-machine.ps1`, which
> performs steps 2–5 for you.

## Configuration

The API reads **`apps/api/.env`** only. `apps/api/.env.example` documents every
variable; the important groups are:

| Variables | Purpose |
| --- | --- |
| `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT` | Database and Redis |
| `JWT_SECRET`, `REFRESH_SECRET`, `COOKIE_SECRET` | Session signing (generated by `setup:credentials`) |
| `WEB_ORIGIN`, `PUBLIC_WEB_URL` | Allowed browser origins and links in emails |
| `SMTP_*`, `MAIL_FROM` | Platform mail (signup, password reset) |
| `SMTP_CREDENTIALS_KEY` | Encrypts organisations' own SMTP passwords (falls back to the JWT secret) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Paid plans and the `payment.captured` webhook |
| `SUPPLIER_PORTAL_SECRET` | Signs supplier portal links (falls back to the JWT secret) |
| `SUBSCRIPTION_GRACE_DAYS`, `SUBSCRIPTION_READ_ONLY_ENFORCED` | Read-only mode after a plan lapses |
| `GOOGLE_OAUTH_*`, `BACKUP_ENCRYPTION_KEY` | Google Drive backups |
| `SENTRY_DSN` | Error reporting |

The web app reads `VITE_*` variables at build time (`VITE_API_URL` when the API is on
another origin). Never commit a real `.env`; only the `.env.example` templates are tracked.

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm run dev` | API + web in watch mode |
| `npm run build` | Build shared types, API and web |
| `npm run lint` | ESLint for API and web |
| `npm test` | API unit tests (Jest) and web tests (Vitest) |
| `npm run test:workflows` | API business-workflow e2e tests (needs a migrated, seeded database) |
| `npm run test:playwright` | Web end-to-end tests |
| `npm run check:bundle-budget` | Fails if web bundles exceed their size budget |
| `npm run check:runtime-health` / `check:api-slo` | Health and latency checks against a running API |
| `cd apps/api && npx prisma migrate dev --name <change>` | Create a migration after editing `schema.prisma` |

## Testing

CI runs on every pull request:

- **Quality gate** — lint, type checks, builds and the web bundle budget
- **Unit tests** — about 840 Jest tests for the API, plus Vitest for the web app
- **API business workflows** — e2e suites against a fresh PostgreSQL + Redis, migrated
  from an empty database
- **Playwright** — web flows on a mobile viewport
- **CodeQL** — static security analysis

See [docs/business-workflow-testing.md](docs/business-workflow-testing.md) for running
the workflow suites locally.

## Deployment

Production deploys are automatic: when CI passes on `main`, the **Deploy to Production**
workflow SSHes to the VPS, checks out that exact commit, installs, builds, runs
`prisma migrate deploy`, restarts the API under PM2 and verifies health, the database and
the deployed commit. A failed health check rolls back to the previous release.

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — pipeline, secrets and safe migrations
- [docs/RUNBOOK.md](docs/RUNBOOK.md) — operating and recovering production
- [docs/postgres-backup-recovery.md](docs/postgres-backup-recovery.md) — backups, WAL archiving and point-in-time restore

## Data integrity and security

- Stock movements and balances commit in one transaction; the database rejects negative stock.
- Document numbers come from per-organisation, concurrency-safe sequences.
- Organisations are isolated by row-level security and service-level shop checks;
  actions are gated by role-based permissions.
- Secrets at rest (SMTP passwords, MFA secrets, backup tokens) are encrypted with AES-256-GCM.
- Production schema changes go through reviewed Prisma migrations — never `prisma db push`.

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Documentation

All guides are indexed in **[docs/README.md](docs/README.md)** — deployment, operations,
backups, testing and design notes.

## Contributing

`main` is always deployable. Work on a short-lived `feat/`, `fix/`, `chore/` or `docs/`
branch, open a pull request using the template, and squash-merge once CI is green. The
full workflow is in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Copyright © 2026 Tharun-code-08 and contributors.

SoftdigitIMS is free software, licensed under the
**[GNU Affero General Public License v3.0](LICENSE)** (`AGPL-3.0-only`).

In short:
- You may use, study, modify and share the code.
- If you distribute it, or **let people use a modified version over a network** (for
  example by hosting it as a service), you must make your complete modified source code
  available to those users under the same license.
- It comes with no warranty.

The [LICENSE](LICENSE) file is the authoritative text.
