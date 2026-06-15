# Phase 2: Operational Confidence

**The shift from "Can I build this?" to "Can I operate this?"**

---

## The Philosophy

At Phase 1, you proved the code works via tests.

At Phase 2, you prove the **system** works by running it.

```
Bad thinking:
  "Let me automate testing so I catch regressions"
  
Better thinking:
  "First, prove it works. Then automate the proof."
```

If your Live E2E journey fails, a CI pipeline just automates the failure.

**This is why Phase 2 starts with Live E2E, not CI.**

---

## Phase 2 Priority Order

```
1. Live E2E Journey        ⭐⭐⭐⭐⭐  (Highest ROI)
2. CI Pipeline             ⭐⭐⭐⭐
3. Health Endpoints        ⭐⭐⭐
4. Database Backups        ⭐⭐⭐
5. Rate Limiting           ⭐⭐
```

**Each item builds on the previous.**

---

## Item 1: Live E2E Journey ⭐⭐⭐⭐⭐

**Do this first. Everything else depends on it.**

One command proves the entire system works.

### What It Does

Walks through a complete business journey:

```
Login
  ↓
Create Product (CREATE_PRODUCT audit written)
  ↓
Receive Goods (RECEIVE_GOODS audit: before + delta = after)
  ↓
Update Product Price (UPDATE_PRODUCT audit: oldValues/newValues)
  ↓
Approve GR (APPROVE audit written)
  ↓
Query all 5 audit records
  ↓
Verify requestId flows through entire system
```

### How to Run

**Prerequisites:**
```bash
npm run dev          # Start dev server in another terminal
npx prisma db seed  # Seed database
```

**Run the journey:**
```bash
# Linux/Mac
./scripts/e2e-audit-journey.sh

# Windows
.\scripts\e2e-audit-journey.ps1

# Against remote server
./scripts/e2e-audit-journey.sh https://api.example.com admin@example.com password
```

### What Success Looks Like

```
══════════════════════════════════════════
ERP AUDIT JOURNEY
══════════════════════════════════════════

✓ LOGIN
✓ CREATE_PRODUCT
✓ RECEIVE_GOODS
✓ UPDATE_PRODUCT
✓ APPROVE

✓ GET /audit returned 5 records

✓ requestId found in:
    ✓ HTTP Response
    ✓ audit_logs database
    (Note: PM2 logs require manual verification on VPS)

══════════════════════════════════════════
REPORT
══════════════════════════════════════════

✓ LOGIN
✓ CREATE_PRODUCT
✓ RECEIVE_GOODS
✓ UPDATE_PRODUCT
✓ APPROVE
✓ GET /audit returned 5 records
✓ requestId found in:
    ✓ HTTP Response
    ✓ audit_logs database

SYSTEM STATUS: OPERATIONAL
══════════════════════════════════════════
```

### What It Proves

- ✅ Real HTTP requests work
- ✅ JWT authentication works
- ✅ Business logic executes correctly
- ✅ Audit records persist to database
- ✅ RequestId propagates end-to-end
- ✅ All 5 audit domains integrate

### Run On

- [ ] Local machine
- [ ] VPS (final proof)

**When both pass, Phase 2 Item 1 is complete.**

---

## Item 2: CI Pipeline ⭐⭐⭐⭐

**Now that you know it works, prevent breaking it.**

### What It Does

Every push runs:
```bash
npm run build
npx tsc --noEmit
npx jest
npm run lint
```

If any fails → merge blocked.

### GitHub Actions

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
        with:
          node-version: 22

      - run: npm ci

      - run: npm run build

      - run: npx tsc --noEmit

      - run: npx jest

      - run: npm run lint
```

### Local Pre-Commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
npm run build && npx tsc --noEmit && npx jest && npm run lint
if [ $? -ne 0 ]; then
  echo "Pre-commit checks failed"
  exit 1
fi
chmod +x .git/hooks/pre-commit
```

### Success Criteria

```
✓ npm run build — no errors, dist/ produced
✓ npx tsc --noEmit — 0 TypeScript errors
✓ npx jest — all suites passing (310 tests)
✓ npm run lint — no violations
```

---

## Item 3: Health Endpoints ⭐⭐⭐

**Know what's wrong when it breaks.**

Three endpoints:

### GET /health
```bash
curl http://localhost:3000/health
```
Response:
```json
{
  "status": "ok",
  "uptime": 12543,
  "memoryMB": 182
}
```

### GET /health/live
```bash
curl http://localhost:3000/health/live
```
Response:
```json
{
  "status": "alive",
  "uptime": 3600
}
```

### GET /health/ready
```bash
curl http://localhost:3000/health/ready
```
Response:
```json
{
  "status": "ready",
  "database": "connected",
  "checks": {
    "postgres": "ok"
  }
}
```

If database dies:
```json
{
  "status": "not_ready",
  "database": "disconnected"
}
```

### Implementation

File: `src/common/health/health.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async health() {
    const uptime = Math.floor(process.uptime());
    const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    return { status: 'ok', uptime, memoryMB: memory };
  }

  @Get('live')
  live() {
    return { status: 'alive', uptime: Math.floor(process.uptime()) };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', database: 'connected', checks: { postgres: 'ok' } };
    } catch {
      return { status: 'not_ready', database: 'disconnected' };
    }
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

## Item 4: Database Backups ⭐⭐⭐

**You can recover from disaster.**

### Script: `scripts/backup-db.sh`

```bash
#!/bin/bash

DATABASE_URL="${DATABASE_URL:-postgresql://...}"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/retail_ims_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

# Create backup
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

# Keep only last 7 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "Backup: $BACKUP_FILE"
```

### Cron Job (Daily at 2 AM)

```bash
0 2 * * * cd /path/to/retail-ims && ./scripts/backup-db.sh
```

### Verify Restore Works

**Important:** A backup is not real until you've restored it.

```bash
# Create test database
createdb retail_ims_test

# Restore from backup
gunzip < ./backups/retail_ims_20260613_000000.sql.gz | psql retail_ims_test

# Verify data
psql -d retail_ims_test -c "SELECT COUNT(*) FROM audit_logs;"

# Clean up
dropdb retail_ims_test
```

---

## Item 5: Rate Limiting ⭐⭐

**Protect against abuse.**

### High-Risk Endpoints

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /auth/login | 5 attempts | 15 minutes |
| GET /audit/export | 100 requests | 1 hour |
| POST /auth/register | 1 request | 1 hour |

### Implementation

File: `src/common/guards/rate-limit.guard.ts`

```typescript
import { Injectable, BadRequestException, CanActivate, ExecutionContext } from '@nestjs/common';

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

- [ ] Live E2E script passes on local machine
- [ ] Live E2E script passes on VPS
- [ ] CI pipeline blocks bad commits
- [ ] Health endpoints return correct status
- [ ] Health endpoints integrated into monitoring
- [ ] Database backup script runs daily
- [ ] Restore from backup verified
- [ ] Rate limiting protects /login endpoint

---

## When Phase 2 is Complete

```
Core Confidence         ██████████
Operational Confidence  ██████████
Growth Features         ░░░░░░░░░░
Enterprise              ░░░░░░░░░░
```

At this point you can:
1. Deploy with confidence (Live E2E proves it works)
2. Know immediately when something breaks (CI pipeline)
3. Know what's wrong when it breaks (health endpoints)
4. Recover from disaster (backups)
5. Protect against abuse (rate limiting)

---

## The Right Order Matters

```
❌ Bad Order:
   CI Pipeline → Build Fails → Wastes Everyone's Time

✅ Right Order:
   Live E2E Passes → CI Enforces It → Stays Passing
```

**Start with Live E2E. It's the proof. Everything else protects it.**
