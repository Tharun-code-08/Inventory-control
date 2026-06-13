# Month 1: Executive Dashboard Specification

**Scope: 6 cards. 30 seconds. Owner knows what to do.**

---

## The Goal

Owner opens ERP at 9 AM.  
Reads dashboard in 30 seconds.  
Knows exactly what to do that day.  
Closes app.  
That's success.

Not vanity charts.  
Not pretty visualizations.  
**Status + Problems + Actions.**

---

## The 6 Cards

### Card 1: Financial Health

**What Owner Sees:**

```
Revenue Today        ₹45,200
Revenue This Month   ₹12,80,000

Gross Profit         ₹3,25,000
Net Profit           ₹2,10,000

Cash Balance         ₹8,40,000
```

**What Owner Knows:**

- "Made ₹45K today" (good/bad?)
- "On track for ₹12.8L this month" (trending up/down?)
- "Profit is ₹2.1L" (20% of revenue)
- "Cash position is healthy" (₹8.4L = 25 days of operations)

**Click/Tap Actions:**

- "Revenue Today" → Daily trend (7-day chart)
- "Revenue This Month" → Monthly trend (last 6 months)
- "Gross Profit" → Profit by product
- "Net Profit" → Profit after all costs

**Data Updated:**

Every transaction (GR, GI, payment)

---

### Card 2: Inventory Health

**What Owner Sees:**

```
Inventory Value      ₹24,50,000

Low Stock Items      12

Dead Stock Value     ₹2,10,000

Inventory Turnover   8.4x
```

**What Owner Knows:**

- "Have ₹24.5L in inventory" (healthy amount?)
- "12 items are low" (need to reorder)
- "₹2.1L is dead" (not selling)
- "Inventory turns 8.4x/year" (fast or slow?)

**Click/Tap Actions:**

- "Inventory Value" → Valuation breakdown (by warehouse, category)
- "Low Stock Items" → List with reorder quantities
- "Dead Stock Value" → Aging report (what's 90+, 180+, 365+ days old)
- "Inventory Turnover" → Which products move fastest

**Data Updated:**

Every GR, GI, transfer

---

### Card 3: Things Requiring Attention

**This is the most important card.**

**What Owner Sees:**

```
Pending Approvals      8
Delayed GR             3
Transfers Pending      5
Supplier Issues        2
```

**What Owner Knows:**

- "8 approvals waiting" (bottleneck?)
- "3 goods receipts are late" (which suppliers?)
- "5 transfers stuck" (which ones?)
- "2 supplier issues" (what happened?)

**What Owner Does:**

"I have 5 things to fix today."

**Click/Tap Actions:**

- "Pending Approvals" → List of GRs/POs waiting for approval with age
- "Delayed GR" → Which receipts are overdue, how long, from which supplier
- "Transfers Pending" → Which transfers need attention, why stuck
- "Supplier Issues" → What went wrong (rejected goods, delayed delivery, quality)

**Data Updated:**

Real-time (as things happen)

---

### Card 4: Security & Audit

**What Owner Sees:**

```
Failed Logins          4

New Devices            1

Suspicious Activities  0

Audit Exports          2
```

**What Owner Knows:**

- "4 failed login attempts" (attempted breach?)
- "1 new device logged in" (employee or threat?)
- "No suspicious activities" (system is clean)
- "2 audit exports" (who's exporting data?)

**Click/Tap Actions:**

- "Failed Logins" → IP address, timestamp, user attempted
- "New Devices" → Device type, browser, user, timestamp
- "Suspicious Activities" → What triggered (unusual quantity change, price jump, etc)
- "Audit Exports" → Who exported what, when

**Data Updated:**

Real-time (every login, export)

---

### Card 5: Top Winners

**This creates engagement.**

**What Owner Sees:**

```
Top Products

1. Rice
2. Oil
3. Sugar

Top Suppliers

1. ABC Traders
2. XYZ Foods

Top Branches

1. Warehouse A
2. Warehouse C
```

**What Owner Knows:**

- "Rice is our biggest business"
- "ABC is our most reliable supplier"
- "Warehouse A is the star location"

**Why This Card?**

Owners love leaderboards. It makes them want to open the app.

**Click/Tap Actions:**

- "Rice" → Product profitability, stock status, movement history
- "ABC Traders" → Supplier scorecard, price trends, quality
- "Warehouse A" → Branch performance vs others

**Data Updated:**

Daily (recalculates top 3)

---

### Card 6: Alerts

**The action list.**

**What Owner Sees:**

```
⚠️ Rice stock below reorder point

⚠️ Supplier ABC delayed 3 days

⚠️ Sugar dead stock > 180 days

⚠️ 5 failed logins in 2 hours
```

**What Owner Knows:**

"These 4 things need action today."

**What Owner Does:**

Tap any alert → Takes action (create PO, investigate supplier, remove dead stock, check security)

**Click/Tap Actions:**

- "Rice stock below" → [Create PO]
- "Supplier delayed" → [Contact supplier] [Switch supplier]
- "Sugar dead stock" → [Discount] [Remove]
- "Failed logins" → [Investigate] [Block IP]

**Data Updated:**

Real-time (as thresholds are crossed)

---

## Architecture

### Module Structure

```
src/modules/dashboard/
├── dashboard.module.ts
├── dashboard.controller.ts
├── dashboard.service.ts
└── services/
    ├── financial.service.ts
    ├── inventory.service.ts
    ├── operations.service.ts
    ├── security.service.ts
    ├── leaderboard.service.ts
    └── alerts.service.ts
```

### Each Service

**Single responsibility:**

- `FinancialService` → revenue, profit, cash
- `InventoryService` → valuation, low stock, dead stock
- `OperationsService` → pending approvals, delayed GRs
- `SecurityService` → failed logins, suspicious activities
- `LeaderboardService` → top products, suppliers, branches
- `AlertsService` → real-time alerts based on thresholds

**Caching:**

- Financial data: cache 30-60 seconds (updated with every transaction)
- Inventory data: cache 30-60 seconds (updated with every movement)
- Operations data: cache 5-10 seconds (urgent)
- Security data: no cache (real-time)
- Leaderboard: cache 1 hour (historical)
- Alerts: cache 5 seconds (near real-time)

**Testing:**

Each service independently testable (unit tests)

### API Endpoints

```typescript
// Get all dashboard data in one call
GET /dashboard
Response: {
  financial: { ... },
  inventory: { ... },
  operations: { ... },
  security: { ... },
  leaderboard: { ... },
  alerts: [ ... ]
}

// Or get individual cards
GET /dashboard/financial
GET /dashboard/inventory
GET /dashboard/operations
GET /dashboard/security
GET /dashboard/leaderboard
GET /dashboard/alerts
```

### Response Example

```json
{
  "financial": {
    "revenueToday": 45200,
    "revenueThisMonth": 1280000,
    "grossProfit": 325000,
    "netProfit": 210000,
    "cashBalance": 840000
  },
  "inventory": {
    "totalValue": 2450000,
    "lowStockCount": 12,
    "deadStockValue": 210000,
    "inventoryTurnover": 8.4
  },
  "operations": {
    "pendingApprovals": 8,
    "delayedGR": 3,
    "transfersPending": 5,
    "supplierIssues": 2
  },
  "security": {
    "failedLogins": 4,
    "newDevices": 1,
    "suspiciousActivities": 0,
    "auditExports": 2
  },
  "leaderboard": {
    "topProducts": ["Rice", "Oil", "Sugar"],
    "topSuppliers": ["ABC Traders", "XYZ Foods"],
    "topBranches": ["Warehouse A", "Warehouse C"]
  },
  "alerts": [
    {
      "type": "LOW_STOCK",
      "product": "Rice",
      "message": "Rice stock below reorder point",
      "action": "create-po"
    },
    {
      "type": "SUPPLIER_DELAY",
      "supplier": "ABC Traders",
      "message": "Supplier ABC delayed 3 days",
      "action": "contact-supplier"
    },
    ...
  ]
}
```

---

## UI Layout

### Mobile

```
┌─────────────────────────┐
│ Executive Dashboard     │
├─────────────────────────┤
│ 💰 Financial Health     │
│ Revenue: ₹45,200        │
│ Profit: ₹2,10,000       │
│ Cash: ₹8,40,000         │
│ [Tap for details]       │
├─────────────────────────┤
│ 📦 Inventory Health     │
│ Value: ₹24,50,000       │
│ Low: 12 items           │
│ Dead: ₹2,10,000         │
│ [Tap for details]       │
├─────────────────────────┤
│ ⚙️ Attention Required    │
│ Approvals: 8            │
│ Delayed GR: 3           │
│ Transfers: 5            │
│ Issues: 2               │
│ [Tap to fix]            │
├─────────────────────────┤
│ 🔒 Security & Audit     │
│ Failed: 4               │
│ New Devices: 1          │
│ [Tap for details]       │
├─────────────────────────┤
│ 🏆 Top Winners          │
│ Rice, Oil, Sugar        │
│ ABC Traders, XYZ Foods  │
│ [Tap for more]          │
├─────────────────────────┤
│ ⚠️ Alerts (4)           │
│ Rice stock low          │
│ Supplier delayed        │
│ Dead stock action       │
│ Failed logins           │
│ [Tap any alert]         │
└─────────────────────────┘
```

### Web

```
Executive Dashboard

┌─────────────────┬─────────────────┬──────────────────┐
│ 💰 Financial    │ 📦 Inventory    │ ⚙️ Attention     │
│                 │                 │                  │
│ Revenue: ₹45K   │ Value: ₹24.5L   │ Approvals: 8     │
│ Profit: ₹2.1L   │ Low: 12 items   │ Delayed GR: 3    │
│ Cash: ₹8.4L     │ Dead: ₹2.1L     │ Transfers: 5     │
│ [Details]       │ [Details]       │ [Details]        │
└─────────────────┴─────────────────┴──────────────────┘

┌──────────────────────┬──────────────────────────────────┐
│ 🔒 Security & Audit  │ 🏆 Top Winners                   │
│                      │                                  │
│ Failed: 4            │ Products: Rice, Oil, Sugar       │
│ New Devices: 1       │ Suppliers: ABC, XYZ              │
│ Suspicious: 0        │ Branches: Warehouse A, C         │
│ Exports: 2           │                                  │
│ [Details]            │ [Details]                        │
└──────────────────────┴──────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ⚠️ Alerts (4)                                            │
│                                                          │
│ Rice stock below reorder [Create PO]                     │
│ Supplier ABC delayed 3 days [Contact]                    │
│ Sugar dead stock > 180 days [Discount]                   │
│ 5 failed logins [Investigate]                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Success Criteria

- [ ] Dashboard loads < 2 seconds
- [ ] Owner reads all 6 cards in 30 seconds
- [ ] Owner knows exactly what to do that day
- [ ] Owner taps each card for drill-down details
- [ ] Mobile and web are identical in data
- [ ] All data is real-time or near real-time
- [ ] No vanity metrics
- [ ] No confused owner

---

## The One Rule for Phase 3

For every feature ask:

**"Will this help the owner make a better decision in under 30 seconds?"**

- YES → Build it
- MAYBE → Postpone it
- NO → Don't build it

This single rule will save you years of feature bloat.

---

## Why This Order Matters

Once Month 1 (Dashboard) exists:

```
Dashboard
    ↓
Inventory Intelligence (makes dashboard smarter)
    ↓
Profit Intelligence (makes dashboard smarter)
    ↓
Supplier Intelligence (makes dashboard smarter)
    ↓
Audit Intelligence (makes dashboard smarter)
```

You're not building reports stacked on top of an ERP.

You're building **an intelligence layer that makes the dashboard smarter.**

---

## Implementation Order

1. **Build the APIs** (all 6 services)
2. **Build the mobile UI** (card layout)
3. **Build the web UI** (grid layout)
4. **Test the drill-downs** (each card → details)
5. **Performance test** (< 2 second load)
6. **User test** (owner can use it)

---

## Success = Owner Behavior

**Owner opens ERP every morning at 9:00 AM.**

Not to enter data.  
Not to check reports.  
**To see what to do that day.**

That's when Month 1 succeeded.

