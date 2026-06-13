# Month 1: Decision Engine Architecture

**The dashboard is just the UI. The real value is the intelligence behind it.**

---

## The Insight

Owner sees the same card for 7 months:

```
Low Stock

12 items
```

But the intelligence grows:

### Month 1
```
Low Stock

12 items
```

### Month 2
```
Low Stock

12 items
3 critical
Predicted stockout: 5 days
```

### Month 5
```
Low Stock

12 items
3 critical
Predicted stockout: 5 days
Recommended reorder: ₹1.2 lakh
Best supplier: ABC Traders
```

### Phase 5
```
Low Stock

AI Recommendation:

Reorder Rice today.

Reason:
Demand increasing.
Supplier ABC price rises next week.

Expected savings:
₹42,000
```

**Frontend card never changes.**  
**Backend intelligence grows.**  
**No breaking API changes.**

---

## The Architecture

### DON'T DO THIS:

```
DashboardController
├── FinancialService
├── InventoryService
├── OperationsService
├── SecurityService
├── LeaderboardService
└── AlertsService
```

Services exposed directly to frontend. Hard to evolve.

### DO THIS:

```
DashboardController
    ↓
DashboardService
    ↓
DecisionEngine
    ↓
├── FinancialService
├── InventoryService
├── OperationsService
├── SecurityService
├── LeaderboardService
├── AlertsService
└── decision-engine/
    ├── recommendation.service.ts
    ├── kpi.service.ts
    └── alert-priority.service.ts
```

DecisionEngine composes all services.  
Frontend calls one endpoint.  
Backend evolves independently.

---

## Folder Structure

```
src/modules/dashboard/

├── dashboard.controller.ts
├── dashboard.service.ts
├── dashboard.module.ts
│
├── services/
│   ├── financial.service.ts
│   ├── inventory.service.ts
│   ├── operations.service.ts
│   ├── security.service.ts
│   ├── leaderboard.service.ts
│   └── alerts.service.ts
│
└── decision-engine/
    ├── decision-engine.service.ts
    ├── recommendation.service.ts
    ├── kpi.service.ts
    └── alert-priority.service.ts
```

### decision-engine.service.ts (Month 1)

```typescript
@Injectable()
export class DecisionEngineService {
  constructor(
    private financial: FinancialService,
    private inventory: InventoryService,
    private operations: OperationsService,
    private security: SecurityService,
    private leaderboard: LeaderboardService,
    private alerts: AlertsService,
    // Phase 3 onwards
    private recommendations: RecommendationService,
    private kpi: KPIService,
    private alertPriority: AlertPriorityService,
  ) {}

  async getDashboardData() {
    return {
      financial: await this.financial.getSnapshot(),
      inventory: await this.inventory.getSnapshot(),
      operations: await this.operations.getSnapshot(),
      security: await this.security.getSnapshot(),
      leaderboard: await this.leaderboard.getTopWinners(),
      alerts: await this.alerts.getAlerts(),
      recommendations: [], // Added now, filled in Month 5+
    };
  }
}
```

### recommendation.service.ts (Empty in Month 1)

```typescript
@Injectable()
export class RecommendationService {
  async getRecommendations(): Promise<Recommendation[]> {
    // Month 1: returns []
    // Month 5: returns AI-generated actions
    // Phase 5: returns reasoning + expected impact
    return [];
  }
}
```

### kpi.service.ts (Empty in Month 1)

```typescript
@Injectable()
export class KPIService {
  async calculateKPIs(): Promise<KPI[]> {
    // Month 1: returns []
    // Month 5: calculates derived metrics
    // Phase 5: includes trend analysis + predictions
    return [];
  }
}
```

### alert-priority.service.ts (Empty in Month 1)

```typescript
@Injectable()
export class AlertPriorityService {
  async prioritizeAlerts(alerts: Alert[]): Promise<PrioritizedAlert[]> {
    // Month 1: returns alerts as-is
    // Month 5: ranks by impact
    // Phase 5: uses ML to predict which alerts matter most
    return alerts.map(a => ({ ...a, priority: 'medium' }));
  }
}
```

---

## The Dashboard API Contract

### Fixed Forever

```typescript
GET /dashboard

Response: {
  financial: {
    revenueToday: number;
    revenueThisMonth: number;
    grossProfit: number;
    netProfit: number;
    cashBalance: number;
  },
  inventory: {
    totalValue: number;
    lowStockCount: number;
    deadStockValue: number;
    inventoryTurnover: number;
  },
  operations: {
    pendingApprovals: number;
    delayedGR: number;
    transfersPending: number;
    supplierIssues: number;
  },
  security: {
    failedLogins: number;
    newDevices: number;
    suspiciousActivities: number;
    auditExports: number;
  },
  leaderboard: {
    topProducts: string[];
    topSuppliers: string[];
    topBranches: string[];
  },
  alerts: Alert[],
  recommendations: [] // Added now, empty now, intelligent later
}
```

### No Breaking Changes

Even if `recommendations` returns `[]` today, it's in the contract.

```
Month 1:  recommendations: []

↓

Month 5:  recommendations: [
            "Reorder Rice",
            "Review ABC Supplier"
          ]

↓

Phase 5:  recommendations: [
            {
              action: "Reorder Rice",
              reason: "Demand increasing, price rising next week",
              expectedSavings: 42000,
              confidence: 0.94
            }
          ]
```

**Frontend never changes.**  
**Backend gets smarter.**

---

## Month 1 Performance: The Foundation

### Materialized Views (Pre-calculated, Cached)

**Don't calculate these on every dashboard load.**

Create database views that refresh every 1 minute or on important writes:

#### financial_snapshot
```sql
SELECT
  SUM(CASE WHEN created_at::date = TODAY() THEN amount ELSE 0 END) as revenue_today,
  SUM(CASE WHEN created_at::date >= DATE_TRUNC('month', NOW()) THEN amount ELSE 0 END) as revenue_month,
  (revenue_total - cost_total) as gross_profit,
  (revenue_total - cost_total - expenses_total) as net_profit,
  cash_balance
FROM financial_summary
WHERE company_id = ?;
```

#### inventory_snapshot
```sql
SELECT
  SUM(quantity * unit_cost) as inventory_value,
  COUNT(*) FILTER (WHERE quantity < min_quantity) as low_stock_count,
  SUM(unit_cost * quantity) FILTER (WHERE last_movement < NOW() - INTERVAL '90 days') as dead_stock_value,
  SUM(quantity * annual_turnover) / SUM(quantity) as avg_turnover
FROM products
WHERE company_id = ?;
```

#### operations_snapshot
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') as pending_approvals,
  COUNT(*) FILTER (WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 day') as delayed_gr,
  COUNT(*) FILTER (WHERE status = 'in_progress') as transfers_pending,
  COUNT(*) FILTER (WHERE status = 'issue') as supplier_issues
FROM operations
WHERE company_id = ?;
```

### Query Performance

```
Without views:     500ms (multiple joins)
With views:        50ms (pre-calculated)
With caching:      < 5ms (Redis)
```

**Month 1 requirement: < 300ms total dashboard load**

---

## What Happens Over Time

```
Month 1: Decision Engine v1
├── 6 services
├── Basic snapshots
└── Empty recommendations folder

↓

Month 2: Decision Engine v1.5
├── 6 services
├── Enriched snapshots (with predictions)
└── Recommendation.service returns simple suggestions

↓

Month 5: Decision Engine v2
├── 6 services
├── Rich snapshots (with forecasts)
├── Recommendation.service returns prioritized actions
└── KPI.service calculates derived metrics

↓

Phase 5: AI Decision Engine v3
├── All services
├── ML-powered snapshots
├── AI recommendations with reasoning
└── Autonomous decision suggestions
```

**Same frontend contract. Growing intelligence.**

---

## Month 1 Success Metrics

**Not:** "Dashboard is complete"

**But:**

### Metric 1: Decision Speed
Can owner answer "Am I making money?" in **5 seconds**?
- [ ] Dashboard loads < 300ms
- [ ] Financial card visible immediately
- [ ] No loading spinners

### Metric 2: Problem Identification
Can owner identify what needs attention in **10 seconds**?
- [ ] Operations card visible
- [ ] Alerts card visible
- [ ] Priority clear (which issues are urgent?)

### Metric 3: Action Clarity
Can owner know what to do in **10 seconds**?
- [ ] Alerts have recommended action
- [ ] One-tap action available
- [ ] No confusion about next steps

### Metric 4: Daily Usage
Does owner open dashboard daily?
- [ ] Opens at 9 AM
- [ ] Spends < 30 seconds
- [ ] Takes action (or delegates)

---

## The Real Foundation

You're not building a dashboard.

You're building a **Decision Engine**.

This is the distinction between:

```
Dashboard (reads data)     → Temporary feature
Decision Engine (owns data) → Enterprise moat
```

In Month 1, it's simple.  
In Month 5, it's predictive.  
In Phase 5, it's autonomous.

**Same frontend. Growing brain.**

---

## Before Engineering Starts

Create these folders:

```
src/modules/dashboard/decision-engine/
├── decision-engine.service.ts
├── recommendation.service.ts
├── kpi.service.ts
└── alert-priority.service.ts
```

Write stubs:

```typescript
// recommendation.service.ts
export class RecommendationService {
  async getRecommendations(): Promise<any[]> {
    return []; // Filled in Month 5
  }
}

// kpi.service.ts
export class KPIService {
  async calculateKPIs(): Promise<any[]> {
    return []; // Filled in Month 5
  }
}

// alert-priority.service.ts
export class AlertPriorityService {
  async prioritizeAlerts(alerts: any[]): Promise<any[]> {
    return alerts; // Enhanced in Month 5
  }
}
```

Then engineering can focus on the real work:

```
DashboardService → DecisionEngine → 6 services → DB
```

---

## Why This Matters

This architectural decision now means:

- **Month 5:** Adding recommendations is a 1-day change, not a rewrite
- **Phase 5:** Adding AI is a 1-week change, not a 3-month rewrite
- **Forever:** Frontend never breaks, backend grows

**That's how enterprise systems should evolve.**

