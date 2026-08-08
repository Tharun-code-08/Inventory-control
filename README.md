# SoftdigitIMS

<p align="center">
  <strong>Inventory Control & ERP Platform</strong><br />
  Multi-tenant operations software for procurement, inventory, sales, documents, analytics, and automation.
</p>

<p align="center">
  <a href="https://github.com/Tharun-code-08/Inventory-control/actions"><img src="https://img.shields.io/github/actions/workflow/status/Tharun-code-08/Inventory-control/ci.yml?branch=main&label=CI&logo=github" alt="CI" /></a>
  <a href="https://github.com/Tharun-code-08/Inventory-control"><img src="https://img.shields.io/github/repo-size/Tharun-code-08/Inventory-control?label=repo%20size" alt="Repository size" /></a>
  <a href="https://github.com/Tharun-code-08/Inventory-control/issues"><img src="https://img.shields.io/github/issues/Tharun-code-08/Inventory-control" alt="Issues" /></a>
  <a href="https://github.com/Tharun-code-08/Inventory-control/pulls"><img src="https://img.shields.io/github/issues-pr/Tharun-code-08/Inventory-control" alt="Pull requests" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/Tharun-code-08/Inventory-control" alt="License" /></a>
</p>

<p align="center">
  <a href="./docs/README.md">Documentation</a> ·
  <a href="./CONTRIBUTING.md">Contributing</a> ·
  <a href="./SECURITY.md">Security</a> ·
  <a href="./DEPLOYMENT.md">Deployment</a>
</p>

---

## Overview

**SoftdigitIMS** is a full-stack inventory and ERP platform designed around real operational workflows. It connects procurement, warehouse inventory, sales, documents, reporting, notifications, and background processing through a single system.

The platform is built with production-oriented guarantees around **shop/tenant isolation, stock integrity, authorization, auditability, transactional consistency, and controlled deployments**.

## Core capabilities

| Domain | Capabilities |
| --- | --- |
| **Procurement** | Purchase orders, approvals, goods receipts, returns, suppliers |
| **Inventory** | Stock ledger, transfers, batches, expiry, FEFO, low-stock monitoring |
| **Sales** | Sales orders, goods issues, returns, payments, customer workflows |
| **Documents** | Invoices, purchase orders, goods receipts, quotations, receipts |
| **Analytics** | KPIs, reports, trends, inventory health, operational metrics |
| **Automation** | Notifications, approvals, background jobs, scheduled workflows |
| **Integrations** | Email, WhatsApp, in-app notifications, payment workflows |
| **Mobile** | Warehouse-focused stock lookup and goods issue workflows |
| **Security** | RBAC, shop/tenant isolation, audit trails, secure authentication |

---

## Architecture

```text
                         ┌───────────────────────┐
                         │      SoftdigitIMS      │
                         │ Inventory + ERP Core  │
                         └───────────┬───────────┘
                                     │
               ┌─────────────────────┼─────────────────────┐
               │                     │                     │
        ┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼──────┐
        │ Web Client  │       │ Mobile App  │       │   REST API  │
        │ React/Vite  │       │ Expo/RN     │       │   NestJS    │
        └──────┬──────┘       └──────┬──────┘       └──────┬──────┘
               │                     │                     │
               └─────────────────────┼─────────────────────┘
                                     │
                          ┌──────────▼──────────┐
                          │   Business Domain   │
                          │ Auth · Stock · PO   │
                          │ Sales · Documents   │
                          └──────────┬──────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
             ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
             │ PostgreSQL  │ │    Redis    │ │   BullMQ    │
             │ Prisma + DB │ │ Cache       │ │ Background  │
             │ constraints │ │             │ │ Jobs        │
             └─────────────┘ └─────────────┘ └─────────────┘
```

### Technology

| Layer | Technology |
| --- | --- |
| Web | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query |
| API | NestJS 11, TypeScript, Prisma |
| Mobile | Expo, React Native |
| Database | PostgreSQL 15 |
| Cache / jobs | Redis, BullMQ |
| Documents | Puppeteer PDF pipeline |
| Local infrastructure | Docker Compose |
| CI/CD | GitHub Actions |

---

## Repository structure

```text
Inventory-control/
├── apps/
│   ├── api/                 # NestJS API, Prisma and domain modules
│   ├── web/                 # React web application
│   └── mobile/              # Expo warehouse application
├── packages/
│   └── shared-types/        # Shared API/client types
├── docker/                  # Local PostgreSQL and Redis services
├── deploy/                  # Deployment configuration
├── scripts/                 # Setup, validation and operational tooling
├── docs/                    # Engineering and operational documentation
├── fixtures/                # Test fixtures for document/PDF validation
├── .github/                 # CI, issue templates and repository governance
├── CONTRIBUTING.md          # Engineering contribution standards
├── SECURITY.md              # Security policy
├── DEPLOYMENT.md            # Deployment procedures
└── RUNBOOK.md               # Operational runbook
```

---

## Getting started

### Prerequisites

- Node.js **20+**
- pnpm **9.15+** (repository package manager)
- Docker Desktop with Docker Compose

### 1. Clone

```bash
git clone https://github.com/Tharun-code-08/Inventory-control.git
cd Inventory-control
```

### 2. Provision

```bash
npm run setup:new-machine
```

To provision without starting development servers:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-new-machine.ps1 -SkipStart
```

### 3. Develop

```bash
npm run dev
```

Or start services independently:

```bash
npm run dev:api
npm run dev:web
npm run dev:mobile
```

> Keep local secrets in environment files. Never commit production credentials, tokens, customer data, or database dumps.

---

## Quality engineering

Run the checks relevant to your change before opening a pull request.

```bash
npm run lint
npm run build
npm test
npm run test:workflows
npm run test:playwright
```

Operational gates:

```bash
npm run check:runtime-health
npm run check:bundle-budget
npm run check:api-slo
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the complete engineering workflow.

---

## Data integrity & security

Inventory is treated as a financial and operational system, not a simple CRUD application.

Key invariants include:

- Stock movements are processed transactionally.
- PostgreSQL maintains critical stock balances and summaries.
- Negative stock is blocked at the database layer.
- Document numbers use concurrency-safe sequencing.
- Batch and expiry workflows support FEFO consumption.
- Shop/tenant isolation is enforced as a core boundary.
- Sensitive operations remain auditable.
- Production schema changes use reviewed Prisma migrations.

### Production rules

- Use `prisma migrate deploy` for production migrations.
- Never use `prisma db push` against production.
- Use strong, unique authentication secrets.
- Restrict CORS / web origins to trusted applications.
- Use secure cookies in production.
- Do not commit credentials, tokens, customer data, database dumps, or generated secrets.

See [SECURITY.md](SECURITY.md).

---

## API

Local Swagger/OpenAPI documentation:

```text
http://localhost:3000/api/docs
```

API routes are versioned under:

```text
/api/v1
```

---

## Deployment

Production changes should go through a feature branch and pull request.

Before promotion, validate:

1. CI and application build
2. Database migrations
3. Runtime health
4. Core procurement and sales workflows
5. Inventory reconciliation
6. Shop/tenant isolation
7. Rollback readiness

See [DEPLOYMENT.md](DEPLOYMENT.md) and [RUNBOOK.md](RUNBOOK.md).

---

## Documentation

| Resource | Purpose |
| --- | --- |
| [Documentation Index](docs/README.md) | Central documentation hub |
| [Contributing](CONTRIBUTING.md) | Development and PR standards |
| [Security](SECURITY.md) | Security policy |
| [Runbook](RUNBOOK.md) | Operations and recovery |
| [Deployment](DEPLOYMENT.md) | Deployment procedures |
| [Business Workflow Testing](docs/business-workflow-testing.md) | End-to-end validation |
| [Deployment Safety Checklist](docs/deployment-safety-checklist.md) | Release validation |
| [Rollback Guide](docs/deploy-rollback-demo.md) | Rollback walkthrough |
| [Changelog](CHANGELOG.md) | Release history |

---

## Contributing

1. Create a focused feature or fix branch.
2. Keep changes scoped and reviewable.
3. Add or update tests for behavior changes.
4. Run the relevant quality checks locally.
5. Document migrations, configuration changes, and deployment impact.
6. Open a pull request using the repository template.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a change.

## Project status

SoftdigitIMS is under active development. Features, APIs, operational procedures, and deployment architecture continue to evolve toward production maturity.

## License

See the repository's license file for the applicable terms.

---

<p align="center">
  <strong>SoftdigitIMS</strong><br />
  Inventory Control & ERP Platform
</p>
