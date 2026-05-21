# Business Workflow Testing — Retail IMS

Test **workflows**, not buttons. The sidebar mirrors ERP operations; automated and manual checks follow the same lifecycle.

| Sidebar section | Test phase |
|-----------------|------------|
| Master Data | Phase 1 |
| Procurement | Phase 2 |
| Sales & Finance | Phase 3 |
| Operations (Warehouse, Reports, Notifications) | Phase 4 (manual + reports API) |
| Security / API / Performance / Mobile | Phases 5–8 |

## Recommended order

1. Master Data  
2. Procurement (+ inventory updates via GR post)  
3. Sales & Finance  
4. Operations  
5. Security  
6. API hardening (Postman / Swagger)  
7. Performance (k6 / JMeter)  
8. Mobile responsiveness (Playwright viewport tests)  
9. Real business scenario simulations  

---

## Automated API workflow suite

End-to-end tests live under `apps/api/test/workflows/`. They exercise the **same chains** a business user runs, via HTTP (Supertest), with JWT auth and real Postgres.

### Prerequisites

```powershell
cd retail-ims
# Postgres + migrations + seed (admin@retailims.com / Admin@123)
npm run docker:deps
npm run prisma:generate --workspace=api
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
npx prisma db seed --schema apps/api/prisma/schema.prisma
```

Ensure `DATABASE_URL` is set in `apps/api/.env`.

### Run

```powershell
cd apps/api
npm run test:e2e:workflows
```

Or from monorepo root:

```powershell
npm run test:workflows
```

Tests **skip automatically** when `DATABASE_URL` is unset (CI sandboxes without Postgres).

### What each file covers

| File | Phase | Flow |
|------|-------|------|
| `phase1-master-data.e2e-spec.ts` | 1 | Company CRUD, plant↔company, SKU uniqueness, supplier/customer validation |
| `phase2-procurement.e2e-spec.ts` | 2 | RFQ → quotation → accept-auto-link; PO confirm → partial/full GR; over-receipt blocked; stock only after GR post |
| `phase3-sales-finance.e2e-spec.ts` | 3 | Sales order totals; goods issue blocked without stock; issue after receipt |
| `phase5-security.e2e-spec.ts` | 5 | 401 without token; login failures; SHOP_USER 403 on `company:write` |
| `phase9-business-scenarios.e2e-spec.ts` | 9 | Partial delivery (40+60); oversell guard |

Shared helpers: `test/helpers/e2e-bootstrap.ts`, `e2e-http.ts`, `workflow-fixture.ts`.

---

## Phase 1 — Master Data (manual supplement)

**Companies:** create, edit, soft-delete (`isActive=false`), reject short names.  
**Plants (shops):** link `companyId`, multiple plants per company, invalid company UUID.  
**Storage locations:** hierarchy, capacity, duplicate codes — verify GR/GI use correct location.  
**Products:** SKU uniqueness, categories, UoM, plant assignment, zero opening stock.  
**Suppliers / customers:** duplicate email/GST, inactive flag, link into RFQ/PO.

*Automated:* phase1 spec.

---

## Phase 2 — Procurement

**Chain:** RFQ → Quotation → Contract → PO → GR (post updates stock).

| Check | Automated |
|-------|-----------|
| Quotation requires valid RFQ | Yes |
| PO confirmed before GR | Yes |
| Partial GR (4 + 6 = 10) | Yes |
| Over-receipt rejected | Yes |
| Stock unchanged until GR `post` | Yes |
| P2P auto-link (contract + PO + GR draft) | Yes |

**Manual:** PDF export job, email notifications, concurrent two-user GR on same PO.

---

## Phase 3 — Sales & Finance

**Chain:** Customer → Sales order → (invoice) → Payment.

| Check | Automated |
|-------|-----------|
| SO line tax/discount | Yes |
| GI blocked with no stock | Yes |
| GI after GR | Yes |

**Manual:** invoice PDF numbering, partial payments, ledger reconciliation.

---

## Phase 4 — Operations

**Warehouse:** transfers, adjustments, physical count — manual + future e2e.  
**Reports:** `GET /api/v1/reports/inventory` totals vs DB; export PDF/XLSX jobs.  
**Notifications:** low stock, approvals — verify queue + email config.

---

## Phase 5 — Security

| Role | Expect |
|------|--------|
| ADMIN | Full master data + procurement |
| INVENTORY_MANAGER | No `user:manage` |
| SHOP_USER | Read master data; GR/GI create; **no** `company:write` |

*Automated:* phase5 spec (API 403).  
**Manual:** hidden sidebar items per role (`apps/web/src/components/Sidebar.tsx` + `permissions.ts`).

---

## Phases 6–8 (tooling)

- **API:** Swagger `http://localhost:3000/api/docs`, invalid payloads, JWT expiry, idempotency headers (`test/idempotency.e2e-spec.ts`).  
- **Performance:** 1k+ products seed, `npm run check:api-slo`, concurrent workflow runs.  
- **Mobile:** Playwright — sidebar scroll, PO table overflow, 375px viewport (add under `apps/web/e2e` when UI gate is ready).

---

## Phase 9 — Business scenarios

| Scenario | Automated |
|----------|-----------|
| Partial supplier delivery (40 + 60) | Yes |
| Oversell / no stock for GI | Yes |
| Plant A → Plant B transfer (atomic) | Manual (stock transfer UI/API) |

---

## Pre-production checklist

Align with [deployment-safety-checklist.md](./deployment-safety-checklist.md):

- [ ] `npm run test` (unit)  
- [ ] `npm run test:e2e:workflows` (with DB)  
- [ ] `npm run lint && npm run build`  
- [ ] Role permissions verified (API + UI)  
- [ ] Error logging / backups / SSL / env configs  
- [ ] Manual smoke: login → PO → partial GR → sales → payment  

---

## CI (GitHub Actions)

Workflow [`.github/workflows/integration-tests.yml`](../../.github/workflows/integration-tests.yml) at the repo root runs on every PR:

| Job | What runs |
|-----|-----------|
| `api-business-workflows` | Postgres 15 + Redis → migrate → seed → `npm run test:e2e:workflows` (includes concurrent GR) |
| `playwright-mobile` | Build API + web → Playwright Phase 8 specs (`apps/web/e2e`) |

## Playwright (Phase 8 — mobile / PO / reports)

```powershell
cd retail-ims
npm install
npx playwright install chromium
# API on :3000 + web on :5200 (or npm run dev from retail-ims)
npm run test:playwright
```

Specs:

- `apps/web/e2e/mobile-sidebar.spec.ts` — overlay nav, ERP sections, routing
- `apps/web/e2e/purchase-orders.spec.ts` — PO table overflow, Create PO
- `apps/web/e2e/reports.spec.ts` — tabs, tables, horizontal scroll

## Concurrent GR (automated)

`apps/api/test/workflows/phase2-concurrent-gr.e2e-spec.ts` — two parallel `post` calls on the same PO; exactly one succeeds when combined qty exceeds the order.
