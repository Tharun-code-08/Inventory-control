# SoftdigitIMS

### Inventory Control & ERP Platform

**SoftdigitIMS** is a multi-tenant inventory and ERP platform for managing procurement, stock, sales, finance workflows, documents, reporting, and operational automation from one system.

> Built for real inventory operations — with tenant isolation, stock integrity, auditability, and production-safe deployment practices as first-class concerns.

## ✨ What it does

| Area | Capabilities |
|---|---|
| **Procurement** | Purchase orders, approvals, goods receipts, returns, supplier workflows |
| **Inventory** | Stock ledger, transfers, batch & expiry tracking, FEFO, low-stock alerts |
| **Sales** | Sales orders, goods issues, returns, payments, customer workflows |
| **Documents** | GST-ready invoice PDFs, POs, GRs, quotations, receipts |
| **Analytics** | KPIs, reports, trends, inventory health, operational metrics |
| **Automation** | Notifications, workflows, approvals, webhooks, scheduled/background jobs |
| **Channels** | Email, WhatsApp, in-app notifications, warehouse mobile workflows |
| **Security** | RBAC, shop/tenant isolation, audit trails, secure authentication |

## 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                       SoftdigitIMS                          │
├───────────────────────┬───────────────────┬─────────────────┤
│ Web · React + Vite    │ Mobile · Expo     │ API · NestJS    │
│ Tailwind + Query      │ Warehouse flows   │ REST + Swagger  │
└───────────────────────┴───────────────────┴─────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
              PostgreSQL 15        Redis + BullMQ
              Prisma + triggers     async workloads
                    │
                    └─────────┬─────────┘
                              │
                    Docker · Deploy · CI
```

### Stack

- **Web:** React 18, Vite, TypeScript, Tailwind CSS, TanStack Query
- **API:** NestJS 11, TypeScript, Prisma
- **Mobile:** Expo / React Native
- **Data:** PostgreSQL 15
- **Async:** Redis + BullMQ
- **Documents:** Puppeteer-based PDF pipeline
- **Infrastructure:** Docker, GitHub Actions, production deployment scripts

## 📁 Repository structure

```text
Inventory-control/
├── apps/
│   ├── api/                 # NestJS API, Prisma, domain modules
│   ├── web/                 # React web application
│   └── mobile/              # Expo warehouse application
├── packages/
│   └── shared-types/        # Shared client/API types
├── docker/                  # Local PostgreSQL + Redis
├── deploy/                  # Deployment configuration
├── scripts/                 # Setup, deployment, validation & operations
├── docs/                    # Architecture, testing & operational docs
└── fixtures/                # Frozen document/PDF test fixtures
```

## 🚀 Quick start

### Requirements

- Node.js **20+**
- npm **10+** or pnpm
- Docker Desktop with Compose

### One-command setup

```bash
npm run setup:new-machine
```

For provisioning without starting the dev servers:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-new-machine.ps1 -SkipStart
```

Then start the application with:

```bash
npm run dev
```

This runs the API and web application together. See the environment section below before connecting to a local or remote database.

## 🧪 Quality & validation

Run the checks relevant to your change before opening a PR:

```bash
npm run lint
npm run build
npm test
npm run test:workflows
npm run test:playwright
```

Additional operational gates are available through:

```bash
npm run check:runtime-health
npm run check:bundle-budget
npm run check:api-slo
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the pull-request and engineering workflow.

## 🔐 Configuration & security

Local API configuration lives in `apps/api/.env`. Generate secure local authentication secrets with:

```bash
npm run setup:credentials
```

Never commit `.env` files, credentials, API keys, database dumps, production data, or generated secrets.

For production:

- use `prisma migrate deploy` rather than `prisma db push`
- use strong JWT/refresh secrets
- restrict allowed web origins
- use secure cookies in production
- keep Redis available for background jobs
- persist exported files or use object storage

See [SECURITY.md](SECURITY.md) for the security policy.

## 🗄️ Database & inventory integrity

Inventory is deliberately enforced at the data layer as well as in application code:

- stock movements are posted through transactional services
- PostgreSQL triggers maintain stock balances and summaries
- negative stock is blocked at the database layer
- document numbering uses transactional advisory locking
- batch/expiry inventory supports FEFO consumption
- tenant/shop isolation is treated as a core invariant

**Production schema changes must go through reviewed Prisma migrations.**

## 📚 Documentation

| Document | Purpose |
|---|---|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development and PR standards |
| [SECURITY.md](SECURITY.md) | Security policy and reporting guidance |
| [RUNBOOK.md](RUNBOOK.md) | Operations, diagnosis and recovery |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deployment procedures |
| [docs/deployment-safety-checklist.md](docs/deployment-safety-checklist.md) | Pre-deployment validation |
| [docs/deploy-rollback-demo.md](docs/deploy-rollback-demo.md) | Rollback walkthrough |
| [docs/hardening-operations-runbook.md](docs/hardening-operations-runbook.md) | Security and operations hardening |
| [docs/business-workflow-testing.md](docs/business-workflow-testing.md) | End-to-end business workflow tests |
| [CHANGELOG.md](CHANGELOG.md) | Release history |

## 📱 Mobile application

The Expo app in `apps/mobile` provides warehouse-focused workflows including authentication, dashboards, stock lookup, goods issues, and low-stock alerts.

```bash
npm run dev:mobile
```

For Android/iOS builds, see the mobile documentation and Expo configuration under `apps/mobile`.

## 🔌 API

When running locally, Swagger documentation is available at:

```text
http://localhost:3000/api/docs
```

API endpoints use the `/api/v1` namespace and the standard `{ success, data, meta? }` response envelope where applicable.

## 🚢 Deployment

Changes merged into `main` can trigger the production deployment pipeline. **Use feature branches and pull requests for all changes.**

Before production promotion, validate migrations, application health, business workflows, inventory reconciliation, and rollback readiness.

See [DEPLOYMENT.md](DEPLOYMENT.md) and [RUNBOOK.md](RUNBOOK.md).

## 🤝 Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md), follow the pull-request template, and keep changes focused and testable.

## 📄 License

See the repository's license file for licensing terms.

---

**SoftdigitIMS** · Inventory Control & ERP Platform
