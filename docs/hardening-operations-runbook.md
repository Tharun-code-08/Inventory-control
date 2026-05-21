# Hardening Operations Runbook

## Authorization Matrix

Core permission matrix is defined in `apps/api/src/common/utils/permission-matrix.ts`.

Minimum critical permissions:

- Purchase Orders: `purchase_order:read`, `purchase_order:create`, `report:export`
- Goods Receipts: `goods_receipt:read`, `goods_receipt:create`
- Payments: `shop:read`, `shop:write`
- Users/Roles: `user:manage`
- Reports: `report:view`, `report:export`

## Correlation and Error Tracing

- Web sends `x-request-id` on every API request.
- API reflects `x-request-id` in responses.
- Error payloads include `requestId` for support and incident triage.

## Queue Reliability Checks

- Health endpoint: `GET /api/v1/health/queue`
- Returns `waiting`, `active`, `failed`, `delayed`, `completed` counts for `exports` and `notifications`.
- Action threshold:
  - `failed > 0`: inspect worker logs and retry policy.
  - `delayed` growth: investigate downstream dependency slowness.

## Stock Reconciliation

- Health endpoint: `GET /api/v1/health/stock-reconciliation`
- Compares `stock_summary` quantities against `stock_ledger` aggregates.
- Any non-zero delta must be investigated before close of business.

## Data Lifecycle Controls

- Preview removable rows: `GET /api/v1/health/retention`
- Execute cleanup job: `POST /api/v1/alerts/retention-run`
- Default policy: delete read alerts older than 90 days.

## Performance and SLO Gates

- Bundle budget check: `npm run check:bundle-budget`
- Runtime health check: `npm run check:runtime-health`
- API SLO sample check: `npm run check:api-slo`
