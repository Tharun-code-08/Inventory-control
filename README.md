# Retail Shop Inventory Management System (Retail IMS)

Monorepo with a **NestJS 11** API (`apps/api`), **React 18 + Vite** web app (`apps/web`), **PostgreSQL 15**, **Prisma** migrations (including DB triggers for stock), **Redis + BullMQ** for async exports, and **Docker** compose for local dependencies.

## Prerequisites

- **Node.js 20+** (CI uses 20; Node 24 also works)
- **PostgreSQL 15+** and **Redis** — via **Docker Compose** in `docker/` *or* installed locally
- **npm 10+** (or **pnpm** if you prefer)

## Environment variables

Put API secrets in **`apps/api/.env`**. The **`npm run dev`** script starts the API via **`scripts/run-api-dev.cjs`**, which runs Nest with **`cwd` = `apps/api`** so **`.env`**, Prisma, and JWT load correctly. If you start the API manually, run commands from **`apps/api`** (or export the same env vars).

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

## One-command setup (npm)

From `retail-ims/`:

```bash
cp apps/api/.env.example apps/api/.env
npm install
docker compose -f docker/docker-compose.yml up -d postgres redis
# or from retail-ims: npm run docker:deps
cd apps/api && npx prisma migrate deploy && npx prisma db seed && cd ../..
npm run dev
```

If you use **local** Postgres/Redis instead of Docker, set **`DATABASE_URL`** (usually port **5432**) and **`REDIS_*`** in `apps/api/.env`, then migrate + seed as above.

This starts **both** the API (port 3000) and the Vite app in one terminal via `concurrently` (Vite is usually **5173**; **`vite.config.ts` may use 5200** if the default dev port is blocked on Windows). To run them separately, use `npm run dev:api` and `npm run dev:web` in two terminals.

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

## Deployment notes

- Run **`prisma migrate deploy`** (not `db push`) in production.
- Set strong `JWT_SECRET` / `REFRESH_SECRET`, enable `secure` cookies (`NODE_ENV=production`), and restrict `WEB_ORIGIN`.
- Ensure **Redis** is reachable for BullMQ workers (same process as API in this repo’s default setup).
- Persist **`EXPORT_STORAGE_DIR`** or replace file URLs with object storage (S3) in a follow-up.

## Architecture notes

- **Stock movements** go through `StockService.postMovement()` inside Prisma transactions; PostgreSQL triggers maintain `stock_ledger.balance_qty` and `stock_summary`.
- **Negative stock** is blocked in the DB on outbound `stock_ledger` inserts.
- **Document numbers** use `document_sequences` + `pg_advisory_xact_lock(hashtext(...))` for concurrency safety.
