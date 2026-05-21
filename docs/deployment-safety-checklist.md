# Deployment Safety Checklist

Use this checklist for every production release.

## 1) Migration-first verification

1. Pull latest branch and install dependencies.
2. Run API Prisma generation and migrations:
   - `npm run prisma:generate --workspace=api`
   - `npx prisma migrate deploy --schema apps/api/prisma/schema.prisma`
3. Verify migration status:
   - `npx prisma migrate status --schema apps/api/prisma/schema.prisma`
4. Start API locally and verify health endpoints:
   - `GET /api/v1/health`
   - `GET /api/v1/health/ready`

## 2) Quality gates (must pass)

1. `npm run lint`
2. `npm run build`
3. `npm run test --workspace=web`
4. `npm run test:workflows` (with `DATABASE_URL` + seed — see [business-workflow-testing.md](./business-workflow-testing.md))

## 3) Post-deploy smoke checks

1. Login and navigate to dashboard without hard refresh.
2. Create Purchase Order and confirm.
3. Create Goods Receipt from PO.
4. Verify Payments list is visible and loading.
5. Verify `/api/v1/health/ready` returns `ok: true`.

## 4) Runtime incident guardrails

1. Alert on API 5xx spikes at edge/proxy and origin.
2. Alert on `/api/v1/health/ready` failures.
3. Track 5xx error budget burn rate and page on sustained breach.
