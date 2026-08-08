# SoftdigitIMS

<p align="center">
  <strong>Inventory Control & ERP Platform</strong><br />
  Multi-tenant operations software for procurement, inventory, sales, documents, analytics, and automation.
</p>

<p align="center">
  <a href="https://github.com/Tharun-code-08/Inventory-control/actions">CI</a> ·
  <a href="https://github.com/Tharun-code-08/Inventory-control/pulls">Pull Requests</a> ·
  <a href="https://github.com/Tharun-code-08/Inventory-control/issues">Issues</a> ·
  <a href="./docs/README.md">Documentation</a>
</p>

---

## Overview

**SoftdigitIMS** is a full-stack inventory and ERP platform designed around real operational workflows. It connects procurement, warehouse inventory, sales, documents, reporting, notifications, and background processing through a single system.

The platform is built with production-oriented guarantees around **shop/tenant isolation, stock integrity, authorization, auditability, transactional consistency, and controlled deployments**.

### Core capabilities

| Domain | Capabilities |
| --- | --- |
| Procurement | Purchase orders, approvals, goods receipts, returns, suppliers |
| Inventory | Stock ledger, transfers, batches, expiry, FEFO, low-stock monitoring |
| Sales | Sales orders, goods issues, returns, payments, customer workflows |
| Documents | Invoices, purchase orders, goods receipts, quotations, receipts |
| Analytics | KPIs, reports, trends, inventory health, operational metrics |
| Automation | Notifications, approvals, background jobs, scheduled workflows |
| Integrations | Email, WhatsApp, in-app notifications, payment workflows |
| Mobile | Warehouse-focused stock lookup and goods issue workflows |
| Security | RBAC, shop/tenant isolation, audit trails, secure authentication |

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
└── fixtures/                # Test fixtures for document/PDF validation
```

---

## Getting started

### Prerequisites

- Node.js **20+**
- npm **10+** or pnpm
- Docker Desktop with Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/Tharun-code-08/Inventory-control.git
cd Inventory-control
```

### 2. Install and provision

```bash
npm run setup:new-machine
```

To provision without starting development servers:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-new-machine.ps1 -SkipStart
```

### 3. Start development

```bash
npm run dev
```

Run services independently when needed:

```bash
npm run dev:api
npm run dev:web
npm run dev:mobile
```

> Local environment variables belong in `apps/api/.env`. Never commit secrets or production credentials.

---

## Configuration

Generate secure local authentication secrets with:

```bash
npm run setup:credentials
```

Common configuration includes:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection |
| `JWT_SECRET` | Access-token signing secret |
| `REFRESH_SECRET` | Refresh-token signing secret |
| `WEB_ORIGIN` | Allowed web origins |
| `VITE_API_URL` | Web application API URL |
| `EXPO_PUBLIC_API_URL` | Mobile application API URL |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Email delivery |

See the environment examples under the relevant application directories for the complete configuration surface.

---

## Quality engineering

The repository includes automated checks for application quality, business workflows, UI behavior, runtime health, bundle size, and API performance.

### Standard checks

```bash
npm run lint
npm run build
npm test
```

### Business workflows

```bash
npm run test:workflows
```

### Browser / UI tests

```bash
npx playwright install chromium
npm run test:playwright
```

### Operational gates

```bash
npm run check:runtime-health
npm run check:bundle-budget
npm run check:api-slo
```

For contribution standards and the expected PR workflow, see [CONTRIBUTING.md](CONTRIBUTING.md).

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

See [SECURITY.md](SECURITY.md) for the security policy.

---

## API

When running locally, Swagger/OpenAPI documentation is available at:

```text
http://localhost:3000/api/docs
```

API routes are versioned under:

```text
/api/v1
```

The API generally uses the standard response envelope:

```json
{
  "success": true,
  "data": {}
}
```

---

## Deployment

The repository includes deployment automation and operational safeguards. Changes merged into `main` may trigger the production deployment pipeline.

**Production changes should go through a feature branch and pull request.**

Before promotion, validate:

1. Application build and CI checks
2. Database migrations
3. Runtime health
4. Core procurement and sales workflows
5. Inventory reconciliation
6. Tenant/shop isolation
7. Rollback readiness

Operational procedures are documented in [DEPLOYMENT.md](DEPLOYMENT.md) and [RUNBOOK.md](RUNBOOK.md).

---

## Documentation

| Document | Description |
| --- | --- |
| [Documentation Index](docs/README.md) | Central documentation hub |
| [Contributing](CONTRIBUTING.md) | Development and PR standards |
| [Security](SECURITY.md) | Security policy |
| [Runbook](RUNBOOK.md) | Operations, diagnosis and recovery |
| [Deployment](DEPLOYMENT.md) | Deployment procedures |
| [Deployment Safety Checklist](docs/deployment-safety-checklist.md) | Pre-deployment validation |
| [Business Workflow Testing](docs/business-workflow-testing.md) | End-to-end workflow validation |
| [Rollback Guide](docs/deploy-rollback-demo.md) | Deployment rollback walkthrough |
| [Hardening Runbook](docs/hardening-operations-runbook.md) | Security and operational hardening |
| [Changelog](CHANGELOG.md) | Release history |

---

## Contributing

Contributions are welcome. Please:

1. Create a focused feature or fix branch.
2. Keep changes scoped and reviewable.
3. Add or update tests for behavior changes.
4. Run the relevant quality checks locally.
5. Document migrations, configuration changes, and deployment impact.
6. Open a pull request using the repository template.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a change.

---

## Project status

SoftdigitIMS is under active development. Features, APIs, operational procedures, and deployment architecture continue to evolve as the platform moves toward production maturity.

For current work, see the repository's [open pull requests](https://github.com/Tharun-code-08/Inventory-control/pulls) and [issues](https://github.com/Tharun-code-08/Inventory-control/issues).

---

## License

See the repository's license file for the applicable terms.

---

<p align="center">
  <strong>SoftdigitIMS</strong><br />
  Inventory Control & ERP Platform
</p>
