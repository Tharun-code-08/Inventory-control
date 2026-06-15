# Month 1: Start Here Monday

**Not a strategy document. Not architecture theory. Implementation.**

The roadmap is locked. Now execute.

---

## Week 1: Dashboard API Response Shape

Build only this:

```typescript
// GET /dashboard

{
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
  
  attention: [
    {
      type: 'pending_approval' | 'delayed_gr' | 'transfer_pending' | 'supplier_issue';
      count: number;
    }
  ],
  
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
  
  alerts: [
    {
      type: string;
      message: string;
      severity: 'critical' | 'warning' | 'info';
      action?: string;
    }
  ],
  
  recommendations: []  // Empty. Ship it anyway.
}
```

### Implementation Week 1

- [ ] Create DashboardController → DashboardService → DecisionEngine
- [ ] Wire up 6 services (financial, inventory, operations, security, leaderboard, alerts)
- [ ] Return hardcoded data (100% correct)
- [ ] Deploy to staging
- [ ] Test response shape

**Goal:** API contract locked. Frontend can start.

---

## Week 2: Materialized Views

Three views. No shortcuts.

### financial_snapshot

```sql
SELECT
  SUM(CASE WHEN created_at::date = TODAY() THEN amount ELSE 0 END) as revenue_today,
  SUM(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()) THEN amount ELSE 0 END) as revenue_month,
  (SELECT revenue_total) as gross_profit,
  (SELECT profit_total) as net_profit,
  (SELECT cash_balance) as cash_balance
FROM financials
WHERE company_id = $1
  AND deleted_at IS NULL;
```

Refresh: Every 60 seconds OR on financial write

### inventory_snapshot

```sql
SELECT
  SUM(quantity * unit_cost) as total_value,
  COUNT(*) FILTER (WHERE quantity < min_quantity) as low_stock_count,
  SUM(unit_cost * quantity) FILTER (WHERE last_movement < NOW() - INTERVAL '90 days') as dead_stock_value,
  (SUM(quantity * annual_turnover) / SUM(quantity)) as inventory_turnover
FROM products
WHERE company_id = $1
  AND deleted_at IS NULL;
```

Refresh: Every 60 seconds OR on inventory write

### operations_snapshot

```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') as pending_approvals,
  COUNT(*) FILTER (WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 day') as delayed_gr,
  COUNT(*) FILTER (WHERE status = 'in_progress') as transfers_pending,
  COUNT(*) FILTER (WHERE status = 'issue') as supplier_issues
FROM operations
WHERE company_id = $1
  AND deleted_at IS NULL;
```

Refresh: Every 60 seconds OR on operation change

### Implementation Week 2

- [ ] Create views in database
- [ ] Set up refresh trigger (write hook)
- [ ] Set up cron refresh (safety net, 60 sec)
- [ ] Create indexes for performance
- [ ] Measure query time (target < 50ms per view)
- [ ] Load test with real data volume
- [ ] Wire up services to use views (not raw tables)

**Goal:** Dashboard API now responds in < 300ms total.

---

## Week 3: UI (Mobile + Web)

### Mobile Layout

```
┌─────────────────────┐
│ Executive Dashboard │
├─────────────────────┤
│ 💰 Financial        │
│ Revenue: ₹45,200    │
│ Profit: ₹2,10,000   │
│ Cash: ₹8,40,000     │
│ [Tap for details]   │
├─────────────────────┤
│ 📦 Inventory        │
│ Value: ₹24,50,000   │
│ Low: 12 items       │
│ [Tap for details]   │
├─────────────────────┤
│ ⚙️ Attention        │
│ Approvals: 8        │
│ Delayed GR: 3       │
│ [Tap to fix]        │
├─────────────────────┤
│ 🔒 Security & Audit │
│ Failed: 4           │
│ [Tap for details]   │
├─────────────────────┤
│ 🏆 Top Winners      │
│ Rice, Oil, Sugar    │
│ [Tap for more]      │
├─────────────────────┤
│ ⚠️ Alerts (3)       │
│ Rice stock low      │
│ [Tap to act]        │
└─────────────────────┘
```

### Web Layout

```
Executive Dashboard

┌────────────┬────────────┬────────────┐
│ 💰 Finance │ 📦 Invento │ ⚙️ Attenti │
├────────────┼────────────┼────────────┤
│ Revenue    │ Value      │ Approvals  │
│ Profit     │ Low: 12    │ Delayed: 3 │
│ Cash       │ Dead       │ Progress   │
└────────────┴────────────┴────────────┘

┌────────────────────────────────────────┐
│ 🔒 Security   │ 🏆 Top Winners         │
├───────────────┼─────────────────────────┤
│ Failed: 4     │ Rice, Oil, Sugar        │
│ Devices: 1    │ ABC Traders, XYZ Food   │
└───────────────┴─────────────────────────┘

┌────────────────────────────────────────┐
│ ⚠️ Alerts (3)                           │
│ • Rice stock low [Reorder]              │
│ • Supplier delayed [Contact]            │
│ • Dead stock [Clearance]                │
└────────────────────────────────────────┘
```

### Implementation Week 3

- [ ] Build 6 card components (shared mobile/web)
- [ ] Call GET /dashboard API
- [ ] Display 6 cards (no charts, no details, no scrolling)
- [ ] Make tappable (drill-down next week)
- [ ] Test on mobile device
- [ ] Test on desktop
- [ ] Measure dashboard load (target < 2 sec total)

**Goal:** Owner opens dashboard, sees business health, understands in 30 seconds.

---

## Week 4: Deploy to Real Users

**Don't polish. Don't perfect. Deploy.**

### Deploy To

3 real businesses.

Not employees. Not friends.

Real business owners who use the system daily.

### Setup

- [ ] Each business gets their own deployed instance
- [ ] Set up monitoring
- [ ] Set up logging
- [ ] Create feedback channel (Slack, Email, WhatsApp)

### Observe (2 Weeks)

```
Daily:
- How often do they open dashboard?
- How long do they spend?
- What do they click?
- What are they looking for?
- What's confusing?

Weekly:
- What's missing?
- What's wrong?
- What would they pay for?
- Would they recommend this?
```

### Improve (1 Week)

Based on observation:
- Fix confusion
- Add missing context
- Improve performance
- Simplify unclear cards

### Then Month 2

Not before real users validate Month 1.

---

## One New Metric

You have:
```
Dashboard load time < 2 sec ✅
```

Add:
```
Decision Time < 30 sec
```

**How to measure:**

```typescript
// Dashboard opened
timestamp_open = now()

// Owner takes first action (tap card, create PO, approve, etc)
timestamp_action = now()

// Decision time
decision_time = timestamp_action - timestamp_open

// Target: < 30 seconds
```

**What it means:**

- < 30 sec: Owner understands and acts fast (good)
- 1-2 min: Owner confused, looking for something (bad)
- 5+ min: Owner needs more information (redesign)

This is a product metric, not a technical metric.

---

## The Audit Foundation

Start logging:

```typescript
{
  eventType: 'VIEW_DASHBOARD',
  userId: 'owner@example.com',
  timestamp: new Date(),
  duration: 45, // seconds
  nextAction: 'APPROVE_GR'
}
```

Extend as you go:

```
Month 2: VIEW_INVENTORY_REPORT
Month 3: VIEW_PROFIT_REPORT
Month 5: RECOMMENDATION_ACCEPTED
Month 7: FORECAST_GENERATED
```

Years later you'll know:
- Which reports matter
- Which recommendations change behavior
- Which owners are growing fastest
- Which features drive revenue

That's not auditing. That's behavioral intelligence.

---

## The Decision

**Don't overthink this.**

Month 1 dashboard is:
- 6 cards
- Real data
- Fast load
- Clear actions

If owner can answer these in 30 seconds:
1. Am I making money?
2. Where is money stuck?
3. What is broken?
4. What should I do today?

Month 1 succeeded.

Everything after that is evolution, not revolution.

---

## The Mindset

Not: "Is this dashboard perfect?"

But: "Do real owners open this every morning?"

Not: "Do we have all the features?"

But: "Can owners make decisions without calling staff?"

Not: "Is the code clean?"

But: "Does the owner trust it?"

---

## What Happens Next

Week 1: API shape (done)
Week 2: Performance (done)
Week 3: UI (done)
Week 4: Deploy to real users (done)
Weeks 5-6: Observe (owners teach you)
Week 7: Improve (fix what owners want)

Then Month 2 starts.

Not because calendar says so.

Because owners validated Month 1.

---

## Stop Reading Strategy Documents

This is the last one.

Everything else is implementation.

Commit code.
Deploy.
Observe.
Improve.
Repeat.

That's the next 6 months.

The roadmap is locked.

Now execute.

