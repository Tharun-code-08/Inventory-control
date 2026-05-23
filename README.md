# Retail Shop Inventory Management System (Retail IMS)

Monorepo with a **NestJS 11** API (`apps/api`), **React 18 + Vite** web app (`apps/web`), **Expo (React Native)** warehouse mobile app (`apps/mobile`), **PostgreSQL 15**, **Prisma** migrations (including DB triggers for stock), **Redis + BullMQ** for async exports, and **Docker** compose for local dependencies.

## Prerequisites

- **Node.js 20+** (CI uses 20; Node 24 also works)
- **PostgreSQL 15+** and **Redis** — via **Docker Compose** in `docker/` *or* installed locally
- **npm 10+** (or **pnpm** if you prefer)

## Environment variables

Put API secrets in **`apps/api/.env`**. The **`npm run dev`** script starts the API via **`scripts/run-api-dev.cjs`**, which runs Nest with **`cwd` = `apps/api`** so **`.env`**, Prisma, and JWT load correctly. If you start the API manually, run commands from **`apps/api`** (or export the same env vars).

To generate a local env file with secure random auth secrets automatically:

```bash
npm run setup:credentials
```

This creates `apps/api/.env` from `apps/api/.env.example` and auto-generates strong values for `JWT_SECRET`, `REFRESH_SECRET`, and `COOKIE_SECRET`.

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Runtime mode | `development` |
| `API_PORT` | HTTP port for API | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | **`localhost:5432`** for a normal local Postgres install. Use **`localhost:5433`** only when you run Postgres via this repo’s Docker Compose (host port **5433** → container **5432**). |
| `JWT_SECRET` | Access token signing secret (min 16 chars) | `change_me_minimum_16_chars` |
| `REFRESH_SECRET` | Refresh token signing secret (min 16 chars) | `change_me_refresh_16` |
| `JWT_ACCESS_EXPIRES` | Access JWT TTL | `15m` |
| `JWT_REFRESH_EXPIRES` | Refresh JWT TTL | `7d` |
| `REFRESH_COOKIE_NAME` | httpOnly cookie name | `refreshToken` |
| `WEB_ORIGIN` | CORS origins for the SPA (comma-separated) | Include **5173** and **5200** hosts if you use the default Vite setup in this repo |
| `REDIS_HOST` | Redis host | `127.0.0.1` |
| `REDIS_PORT` | Redis port | `6379` |
| `EXPORT_STORAGE_DIR` | PDF/XLSX output directory | `./storage/exports` |
| `VITE_API_URL` | API base URL for Vite dev | `http://localhost:3000` |
| `EXPO_PUBLIC_API_URL` | API origin for mobile (no `/api/v1` suffix) | `http://localhost:3000` or `https://softdigitconsulting.com` |
| `MAIL_FROM` | Sender for RFQ supplier invites | `office@softdigitconsulting.com` |
| `PUBLIC_WEB_URL` | SPA URL embedded in supplier portal emails | `http://localhost:5173` |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | SMTP for RFQ invite emails (required to **Send** an RFQ) | e.g. `smtp.office365.com` |

## One-command setup (npm)

From `retail-ims/`:

```bash
npm run setup:new-machine
```

This single task does all setup steps in order:

- installs dependencies
- creates `apps/api/.env` if missing (`setup:credentials`)
- starts Docker Postgres + Redis
- runs Prisma migrations
- seeds data (including `admin@retailims.com` / `Admin@123`)
- starts API + web dev servers

If you only want provisioning (without launching dev servers), run:

```bash
powershell -ExecutionPolicy Bypass -File scripts/setup-new-machine.ps1 -SkipStart
```

If you use **local** Postgres/Redis instead of Docker, set **`DATABASE_URL`** (usually port **5432**) and **`REDIS_*`** in `apps/api/.env`, then migrate + seed as above.

This starts **both** the API (port 3000) and the Vite app in one terminal via `concurrently` (Vite is usually **5173**; **`vite.config.ts` may use 5200** if the default dev port is blocked on Windows). To run them separately, use `npm run dev:api` and `npm run dev:web` in two terminals.

## Mobile app (Expo — warehouse MVP)

Native app at **`apps/mobile`** (Expo SDK **54**, matches current Expo Go): login, dashboard KPIs, products/stock lookup, goods issues (create + post), and low-stock alerts. Uses the same NestJS API with **body-based refresh tokens** (no browser cookies).

### Setup

```bash
cd retail-ims
npm install
cp apps/mobile/.env.example apps/mobile/.env
# Edit EXPO_PUBLIC_API_URL (see below)
```

### Run locally

```bash
# Terminal 1 — API
npm run dev:api

# Terminal 2 — Expo
npm run dev:mobile
```

Then press **`a`** (Android emulator), **`i`** (iOS simulator, macOS only), or scan the QR code with **Expo Go** on a physical device.

| Environment | `EXPO_PUBLIC_API_URL` |
|-------------|------------------------|
| API on same PC, Android emulator | `http://10.0.2.2:3000` |
| API on same PC, physical phone (same Wi‑Fi) | `http://<your-pc-lan-ip>:3000` |
| Production | `https://softdigitconsulting.com` |

### Mobile auth endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/auth/mobile/login` | Returns `{ accessToken, refreshToken, user }` |
| POST | `/api/v1/auth/mobile/refresh` | Body `{ refreshToken }` — no CSRF cookie |
| POST | `/api/v1/auth/mobile/logout` | Bearer + body `{ refreshToken }` revokes session |

Web cookie login (`POST /auth/login`, `POST /auth/refresh`) is unchanged.

### EAS builds (optional)

From `apps/mobile` after `npm install -g eas-cli` and `eas login`:

```bash
cd apps/mobile
eas build --profile preview --platform android
```

Profiles are defined in `apps/mobile/eas.json` (`development`, `preview`, `production`).

**pnpm equivalent** (if you use pnpm):

```bash
cp apps/api/.env.example apps/api/.env
pnpm install
docker compose -f docker/docker-compose.yml up -d postgres redis
# or from retail-ims: pnpm run docker:deps
pnpm --filter api exec prisma migrate deploy
pnpm --filter api exec prisma db seed
pnpm dev
```

## Default credentials (seed)

- **Admin:** `admin@retailims.com` / `Admin@123`
- **Shop users:** `shop1@retailims.com`, `shop2@retailims.com` / `Admin@123`
- **Inventory manager:** `inventory@retailims.com` / `Admin@123`

## API documentation

With the API running: **http://localhost:3000/api/docs** (Swagger).

All JSON endpoints are under **`/api/v1`** and use the standard `{ success, data, meta? }` envelope unless marked with raw HTML/file responses (print + export downloads).

## Tests

**API (Jest + Supertest):**

```bash
cd apps/api
set DATABASE_URL=postgresql://...   # Windows PowerShell: $env:DATABASE_URL="..."
npm test
```

**Business workflow e2e** (Master Data → Procurement → Sales → Security → scenarios; requires migrated DB + seed):

```bash
npm run test:workflows
```

See [docs/business-workflow-testing.md](docs/business-workflow-testing.md) for the full phase map and manual checks.

**Playwright (Phase 8 UI — mobile sidebar, PO tables, reports):**

```bash
npx playwright install chromium
npm run test:playwright
```

Requires API (`:3000`) and web (`:5200`) running, or use CI `integration-tests` workflow.

**Web (Vitest + RTL):**

```bash
cd apps/web
npm test
```

## Production build

```bash
npm run build --workspace=api
npm run build --workspace=web
```

### API build scripts (team usage)

In `apps/api`:

- `npm run build`
  - Runs `nest build` only.
  - Use for day-to-day compile checks and CI where Prisma Client is already generated.
  - Preferred on Windows when Prisma engine file locks can occur.

- `npm run prisma:generate`
  - Runs `prisma generate` only.
  - Use after Prisma schema/client changes, dependency refresh, or fresh setup.

- `npm run build:full`
  - Runs `prisma generate && nest build`.
  - Use when you explicitly need both Prisma client regeneration and API compile in one command.

Run API with `node apps/api/dist/main.js` after `DATABASE_URL` and Redis are configured.

### Web production (important)

The live site must serve the **built** SPA, not the Vite dev server and not the raw `index.html` from the repo root.

```bash
cd retail-ims
npm run build --workspace=web
```

Deploy the contents of **`apps/web/dist/`** (static files). The built `index.html` loads hashed files under `/assets/` (for example `/assets/page-products-*.js`). If the browser tries to load `/src/pages/ProductsPage.tsx`, production is pointing at dev mode or the wrong folder.

- Do **not** run `npm run dev --workspace=web` on the public domain.
- After each deploy, hard-refresh or clear cache once so old JS chunks are not reused.

## Deployment notes

- Run **`prisma migrate deploy`** (not `db push`) in production.
- Set strong `JWT_SECRET` / `REFRESH_SECRET`, enable `secure` cookies (`NODE_ENV=production`), and restrict `WEB_ORIGIN`.
- Ensure **Redis** is reachable for BullMQ workers (same process as API in this repo’s default setup).
- Persist **`EXPORT_STORAGE_DIR`** or replace file URLs with object storage (S3) in a follow-up.

## Architecture notes

- **Stock movements** go through `StockService.postMovement()` inside Prisma transactions; PostgreSQL triggers maintain `stock_ledger.balance_qty` and `stock_summary`.
- **Negative stock** is blocked in the DB on outbound `stock_ledger` inserts.
- **Document numbers** use `document_sequences` + `pg_advisory_xact_lock(hashtext(...))` for concurrency safety.

## Phase 1 priorities (must-have first)

To complete the core procure-to-pay (P2P) flow first, prioritize delivery in this order:

1. KPI Dashboard
2. Quotation Comparison
3. PO Approval Workflow
4. Low Stock Alerts
5. Stock Transfer
6. Sales Orders
7. Invoice Generation
8. Role-Based Access
9. Reports

## Daily operations flow (P2P + inventory)

Typical day-to-day flow across procurement, warehouse, supplier collaboration, and finance:

1. Purchase Order (PO) is raised and approved.
2. Goods are received in one or more parts (Partial GR).
3. Damaged or incorrect quantities are returned (Goods Return) when needed.
4. Stock Ledger records every movement automatically in the background.
5. Finance tracks payable amounts, due dates, and settlements (Payment Tracking).
6. Supplier Portal exposes shared status (PO, GR, returns, payment state) to suppliers.
7. Notifications keep all stakeholders informed at each step.

## Implementation priorities and guardrails

- **Stock ledger must be fully automatic:** users should never create ledger entries manually. GR, goods issue, goods return, and stock transfer flows must all post ledger movements in backend transactions.
- **Notifications rollout:** start with email using SMTP/SendGrid; enable WhatsApp only after onboarding with WhatsApp Business API providers (for example Twilio or WATI) and approved Meta templates.
- **Supplier portal architecture:** build as a separate subdomain (for example `portal.yoursite.com`) with isolated authentication and authorization, while reading from the same ERP database and service layer.
