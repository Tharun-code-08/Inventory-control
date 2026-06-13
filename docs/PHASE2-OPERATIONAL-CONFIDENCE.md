# Phase 2: Operational Confidence

After Phase 1 proved the architecture works via unit tests, Phase 2 proves the **system works operationally** — that real HTTP requests flow through the system, hit the database, and produce the expected audit trail.

## What Phase 2 Validates

```
Real HTTP Request
       ↓
     JWT Auth
       ↓
   Business Logic
       ↓
     Database Write
       ↓
   Audit Record
       ↓
    PM2 Log Entry
```

Phase 1 proved each piece works in isolation.
Phase 2 proves they work together.

---

## Item 1: Live E2E Curl Script ⭐⭐⭐

**Highest ROI item.** One command proves everything works end-to-end.

### Location
```
scripts/e2e-audit-journey.sh    (Bash)
scripts/e2e-audit-journey.ps1   (PowerShell)
```

### The Journey

The script walks through an entire business flow:

```
1. Login                    → Verify JWT works, requestId captured
2. Resolve Shop/Location    → Verify API structure
3. Create Product           → CREATE_PRODUCT audit written
4. Create & Post GR         → RECEIVE_GOODS audit written, before+delta=after
5. Update Product Price     → UPDATE_PRODUCT audit written (oldValues/newValues)
6. Create & Approve GR      → APPROVE audit written
7. GET /audit               → Verify 5+ records exist
8. Export Audit             → Verify export endpoint works
9. Verify RequestId         → Trace requestId through system
```

### How to Run

**Before you start:**
- Start the dev server: `npm run dev` (or have it running on your server)
- Ensure database is seeded: `npx prisma db seed`

**Option A: Local development (Linux/Mac)**
```bash
cd retail-ims
./scripts/e2e-audit-journey.sh
```

**Option B: Local development (Windows)**
```powershell
cd retail-ims
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\scripts\e2e-audit-journey.ps1
```

**Option C: Against remote server**
```bash
./scripts/e2e-audit-journey.sh https://api.example.com admin@example.com password
```

### What Success Looks Like

```
═══════════════════════════════════════
Phase 2: Live E2E Audit Journey
═══════════════════════════════════════

→ Step 1: LOGIN
✓ LOGIN successful (user: abc123)

→ Step 2: Resolving company and shop...
✓ Company ID: company-1
✓ Shop ID: shop-1

→ Step 3: Resolving storage location...
✓ Storage Location ID: loc-1

→ Step 4: CREATE PRODUCT
✓ CREATE_PRODUCT: product-123

→ Step 5: RECEIVE GOODS
✓ GR Draft created: gr-456
→ Posting goods receipt...
✓ RECEIVE_GOODS: GR posted

→ Step 6: UPDATE PRODUCT PRICE
✓ UPDATE_PRODUCT: price 150 → 200

→ Step 7: APPROVE GOODS RECEIPT
✓ Approval request created: approval-789
✓ APPROVE: GR approved

→ Step 8: GET /AUDIT
Audit records for this user:
  LOGIN: 1
  CREATE_PRODUCT: 1
  RECEIVE_GOODS: 1
  UPDATE_PRODUCT: 1
  APPROVE: 1
✓ All expected audit records present

→ Step 9: EXPORT AUDIT
✓ EXPORT AUDIT: 5 records exported

→ Step 10: VERIFY REQUEST ID PROPAGATION
✓ RequestId propagated through audit system

═══════════════════════════════════════
✓ E2E Journey Complete
═══════════════════════════════════════

Proof of System Health:
  Login works ✓
  Create Product works ✓
  Receive Goods works ✓
  Update Product works ✓
  Approve GR works ✓
  Audit records persisted ✓
  RequestId propagated ✓

System Status: OPERATIONAL
```

### What Happens If It Fails

Each step logs clearly. If a step fails, the script stops with the error.

**Common failures:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Server not responding` | Dev server not running | `npm run dev` |
| `Login failed` | Invalid credentials | Check .env SEED_ADMIN_EMAIL/PASSWORD |
| `No company found` | Database not seeded | `npx prisma db seed` |
| `Missing audit records` | Audit logging not wired | Check approval.service.ts has audit.log() calls |
| `RequestId not found` | Middleware not capturing header | Check request-context.middleware.ts |

---

## Item 2: CI Pipeline ⭐⭐⭐

**Every commit must pass:**
```bash
npm run build
npx tsc --noEmit
npx jest
npm run lint
```

### How to Set Up

**GitHub Actions (if you use GitHub):**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: retail_ims_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm run build
      - run: npx tsc --noEmit
      - run: npx jest
      - run: npm run lint
```

**Local Pre-commit Hook:**

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
npm run build && npx tsc --noEmit && npx jest && npm run lint
if [ $? -ne 0 ]; then
  echo "Pre-commit checks failed"
  exit 1
fi
```

### Success Criteria

```
✓ npm run build — no errors, output in dist/
✓ npx tsc --noEmit — 0 TypeScript errors
✓ npx jest — all suites passing
✓ npm run lint — no linting violations
```

---

## Item 3: Health Endpoints ⭐⭐

Three health check endpoints:

### GET /health
Returns 200 if server is running.
```bash
curl http://localhost:3000/health
```
Response:
```json
{ "status": "ok" }
```

### GET /health/ready
Returns 200 if database is connected and ready to serve requests.
```bash
curl http://localhost:3000/health/ready
```
Response:
```json
{
  "status": "ready",
  "database": "connected",
  "checks": {
    "postgres": "ok",
    "memory_usage": "45%"
  }
}
```

### GET /health/live
Returns 200 if server is alive (used by Kubernetes liveness probes).
```bash
curl http://localhost:3000/health/live
```
Response:
```json
{ "status": "alive", "uptime": 3600 }
```

### Implementation

File: `src/common/health/health.controller.ts`

```typescript
import { Controller, Get, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Controller('health')
@Injectable()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  health() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        database: 'connected',
        checks: { postgres: 'ok', memory_usage: this.getMemoryUsage() },
      };
    } catch {
      return { status: 'not_ready', database: 'disconnected' };
    }
  }

  @Get('live')
  live() {
    return { status: 'alive', uptime: process.uptime() };
  }

  private getMemoryUsage() {
    const used = process.memoryUsage();
    const percent = Math.round((used.heapUsed / used.heapTotal) * 100);
    return `${percent}%`;
  }
}
```

Add to `app.module.ts`:
```typescript
import { HealthController } from '@/common/health/health.controller';

@Module({
  controllers: [HealthController, ...],
})
export class AppModule {}
```

---

## Item 4: Backups ⭐⭐

Daily snapshots of the PostgreSQL database.

### Script: `scripts/backup-database.sh`

```bash
#!/bin/bash

DATABASE_URL="${DATABASE_URL:-postgresql://...}"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/retail_ims_$TIMESTAMP.dump"

mkdir -p "$BACKUP_DIR"

# Create backup
pg_dump "$DATABASE_URL" -Fc -v -f "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"

# Keep only last 7 days
find "$BACKUP_DIR" -name "*.dump.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

### Cron Job (Linux/Mac)

```bash
# Daily at 2 AM
0 2 * * * cd /path/to/retail-ims && ./scripts/backup-database.sh
```

### Verify Restore Works

Once:
```bash
# Create a test database
createdb retail_ims_test

# Restore from backup
pg_restore -d retail_ims_test ./backups/retail_ims_20260613_000000.dump.gz

# Verify data exists
psql -d retail_ims_test -c "SELECT COUNT(*) FROM audit_logs;"

# Clean up
dropdb retail_ims_test
```

---

## Item 5: Rate Limiting ⭐

Protect against brute force and abuse.

### High-Risk Endpoints

- POST /api/v1/auth/login (5 attempts per 15 min per IP)
- GET /api/v1/audit/export (100 per hour per user)
- POST /api/v1/auth/register (1 per hour per email)

### Implementation

File: `src/common/guards/rate-limit.guard.ts`

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private attempts = new Map<string, { count: number; resetAt: number }>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = `${request.method}:${request.path}:${request.ip}`;
    const now = Date.now();

    let attempt = this.attempts.get(key);
    if (!attempt || now > attempt.resetAt) {
      attempt = { count: 0, resetAt: now + 15 * 60 * 1000 };
    }

    attempt.count++;
    this.attempts.set(key, attempt);

    if (attempt.count > 5) {
      throw new BadRequestException('Too many requests. Try again later.');
    }

    return true;
  }
}
```

Usage in controller:
```typescript
@Post('login')
@UseGuards(RateLimitGuard)
async login(@Body() dto: LoginDto) {
  // ...
}
```

---

## Phase 2 Completion Checklist

- [ ] Live E2E script runs successfully
- [ ] All 5 audit records appear in GET /audit
- [ ] RequestId flows through entire system
- [ ] CI pipeline blocks bad merges
- [ ] Health endpoints return correct status
- [ ] Database backup script works
- [ ] Restore from backup verified
- [ ] Rate limiting protects auth endpoints

---

## When Phase 2 is Complete

```
Build              ✅
Types              ✅
Tests              ✅
Live E2E           ✅

Operational Confidence

██████████
```

At this point, you can:
1. Deploy with confidence
2. Debug issues via health endpoints
3. Recover from disaster via backups
4. Protect against abuse via rate limiting
5. Prove the system works via E2E script

This is when you move to Phase 3: Growth.

---

## Running Phase 2 Validation

**One-time setup:**
```bash
chmod +x scripts/e2e-audit-journey.sh
chmod +x scripts/backup-database.sh
npm run dev  # Start server in another terminal
```

**Daily validation:**
```bash
# Run the E2E journey
./scripts/e2e-audit-journey.sh

# Verify health endpoints
curl http://localhost:3000/health/ready | jq .

# Test backup
./scripts/backup-database.sh
```

**Continuous validation:**
- Every push: CI pipeline runs automatically
- Every hour: Backups run via cron
- Every request to /login: Rate limiting applies
