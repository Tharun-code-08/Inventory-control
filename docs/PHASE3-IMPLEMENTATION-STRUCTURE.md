# Phase 3: Week-by-Week Implementation Structure

**Building a decision system: Mobile & Web parity, 10 perfect reports**

---

## Overview

- **Duration:** 7 weeks
- **Team:** 2 engineers (1 mobile, 1 web/backend)
- **Approach:** Build mobile AND web simultaneously for each report
- **Quality:** < 3 second load time, < 100 KB per screen

---

## Week 1-2: Executive Dashboard + Inventory Valuation

### Week 1: Backend + Mobile

#### Backend (Shared API)

**New endpoints:**
```typescript
GET /reports/executive-summary
GET /reports/inventory-valuation
GET /reports/inventory-valuation/by-warehouse
GET /reports/inventory-valuation/by-category
```

**Responses:**
```typescript
// Executive Summary
{
  financial: {
    revenueToday: 45230,
    revenueThisMonth: 982100,
    grossProfit: 245500,
    inventoryValue: 1432500,
    deadStockValue: 210000,
    outstandingPayments: 560000
  },
  operational: {
    pendingApprovals: 5,
    lowStockProducts: 3,
    goodsReceivedToday: 8,
    stockTransfersInProgress: 2,
    damagedStock: 12000,
    outOfStockProducts: 2
  },
  growth: {
    topProduct: { name: "Rice", units: 450 },
    slowestProduct: { name: "Exotic Spice", units: 8 },
    topCustomer: { name: "XYZ Corp", revenue: 125000 },
    topBranch: { name: "Branch A", revenue: 520000 },
    fastestCategory: { name: "Oils", change: 23 }
  }
}

// Inventory Valuation
{
  totalValue: 1432500,
  byWarehouse: [
    { name: "Warehouse A", value: 780000, percentage: 54.4 },
    { name: "Warehouse B", value: 652500, percentage: 45.6 }
  ],
  byCategory: [
    { name: "Rice", value: 450000, percentage: 31.4 },
    { name: "Oil", value: 320000, percentage: 22.3 },
    { name: "Sugar", value: 180000, percentage: 12.6 }
  ]
}
```

**Database queries:**
```sql
-- Executive Summary
SELECT 
  SUM(p.quantity * p.unit_cost) as totalValue,
  COUNT(CASE WHEN p.quantity < p.min_quantity THEN 1 END) as lowStock,
  COUNT(CASE WHEN p.quantity = 0 THEN 1 END) as outOfStock
FROM products p
WHERE p.company_id = $1;

-- Inventory by warehouse
SELECT 
  w.id, 
  w.name, 
  SUM(p.quantity * p.unit_cost) as totalValue
FROM warehouses w
LEFT JOIN products p ON w.id = p.warehouse_id
WHERE w.company_id = $1
GROUP BY w.id, w.name;

-- Inventory by category
SELECT 
  c.id,
  c.name,
  SUM(p.quantity * p.unit_cost) as totalValue
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
WHERE p.company_id = $1
GROUP BY c.id, c.name;
```

**New service:**
```typescript
// src/modules/reports/reports.service.ts

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getExecutiveSummary(companyId: string) {
    // Implement queries above
  }

  async getInventoryValuation(companyId: string) {
    // Implement inventory by warehouse/category
  }

  async getInventoryByWarehouse(companyId: string, warehouseId: string) {
    // For drill-down
  }

  async getInventoryByCategory(companyId: string, categoryId: string) {
    // For drill-down
  }
}
```

#### Mobile (React Native Expo)

**New screens:**
```typescript
// apps/mobile/src/screens/Reports/ExecutiveDashboardScreen.tsx
// apps/mobile/src/screens/Reports/InventoryValuationScreen.tsx
```

**Components:**
```typescript
// src/components/Executive/FinancialKPIs.tsx
// src/components/Executive/OperationalKPIs.tsx
// src/components/Executive/GrowthKPIs.tsx
// src/components/Inventory/InventoryCard.tsx
// src/components/Inventory/WarehouseBreakdown.tsx
// src/components/Inventory/CategoryBreakdown.tsx
```

**Features:**
- Fetch executive summary
- Display KPI cards with trending indicators
- Tap warehouse/category → drill-down to details
- Scroll-friendly list layout
- < 3 second load time

**UI Mock:**
```
Executive Dashboard

Financial                    Operational
Revenue Today: ₹45,230      Pending: 5 ⚠
Revenue Month: ₹9,82,100    Low Stock: 3 ⚠
Gross Profit: ₹2,45,500     Out: 2 ⚠

Inventory Value: ₹14,32,500
Dead Stock: ₹2,10,000

Growth
Top: Rice (450 units)
Slow: Exotic Spice (8 units)

[View Details] [Actions]
```

**Testing:**
- [ ] API returns correct totals
- [ ] Mobile loads < 3 seconds
- [ ] Tap actions work (drill-down)
- [ ] Data updates when inventory changes

---

### Week 2: Web + Polish

#### Web (React)

**New components:**
```typescript
// apps/web/src/pages/Reports/ExecutiveDashboard.tsx
// apps/web/src/pages/Reports/InventoryValuation.tsx
// apps/web/src/components/Reports/KPICard.tsx
// apps/web/src/components/Reports/TrendIndicator.tsx
```

**Features:**
- Grid layout for 4-column display
- Charts (recharts) for financial KPIs
- Table view for detailed breakdown
- Export to CSV
- Date range filter

**UI Mock:**
```
Executive Dashboard

Financial KPIs           Operational KPIs
┌─────────────────┐    ┌─────────────────┐
│ Revenue: ₹9.8L  │    │ Pending: 5      │
│ ↑ +12%          │    │ Low Stock: 3    │
├─────────────────┤    │ Out: 2          │
│ Profit: ₹2.4L   │    └─────────────────┘
│ ↑ +8%           │
└─────────────────┘

Inventory Valuation

Total: ₹14.32L

By Warehouse          By Category
├─ A: ₹7.8L (54%)    ├─ Rice: ₹4.5L (31%)
├─ B: ₹6.5L (46%)    ├─ Oil: ₹3.2L (22%)
                      └─ Others: ₹6.6L (47%)

[Export CSV] [Export PDF]
```

#### Mobile Polish

- Fix performance issues
- Add offline caching (Redux)
- Improve touch targets
- Dark mode support

#### End of Week 2 Checklist

- [ ] Executive Dashboard mobile ✓ (< 3s load)
- [ ] Executive Dashboard web ✓ (< 3s load)
- [ ] Inventory Valuation mobile ✓
- [ ] Inventory Valuation web ✓
- [ ] Drill-down working (warehouse → products)
- [ ] Mobile & web show same data
- [ ] Tests passing (unit + integration)

---

## Week 2-3: Low Stock + Dead Stock + Forecast

### Week 2 Backend

**New endpoints:**
```typescript
GET /reports/low-stock
GET /reports/low-stock/forecast
GET /reports/dead-stock
```

**Database queries:**
```sql
-- Low Stock
SELECT 
  p.id, p.name, p.quantity, p.min_quantity,
  (p.min_quantity - p.quantity) as shortage,
  p.category_id, c.name as category
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.quantity < p.min_quantity 
  AND p.company_id = $1
ORDER BY shortage DESC;

-- Dead Stock
SELECT 
  p.id, p.name, p.quantity, p.unit_cost,
  (p.quantity * p.unit_cost) as value,
  MAX(al.created_at) as last_moved,
  EXTRACT(DAY FROM NOW() - MAX(al.created_at)) as days_since_move
FROM products p
LEFT JOIN audit_logs al ON p.id = al.entity_id 
  AND al.action IN ('RECEIVE_GOODS', 'ISSUE_GOODS')
WHERE p.company_id = $1
GROUP BY p.id
HAVING MAX(al.created_at) < NOW() - INTERVAL '30 days'
  OR MAX(al.created_at) IS NULL
ORDER BY days_since_move DESC;

-- Low Stock Forecast (next 7 days)
WITH daily_usage AS (
  SELECT 
    entity_id,
    AVG(CAST(new_values->>'quantity' as INTEGER) - 
        CAST(old_values->>'quantity' as INTEGER)) as daily_change
  FROM audit_logs
  WHERE action IN ('ISSUE_GOODS')
    AND created_at > NOW() - INTERVAL '30 days'
  GROUP BY entity_id
)
SELECT 
  p.id, p.name, p.quantity, du.daily_change,
  CEIL(p.quantity / ABS(du.daily_change)) as days_left
FROM products p
JOIN daily_usage du ON p.id = du.entity_id
WHERE p.company_id = $1
  AND du.daily_change < 0
ORDER BY days_left ASC;
```

### Week 2-3 Mobile

**Screens:**
```typescript
// LowStockScreen.tsx
// DeadStockScreen.tsx
// ForecastScreen.tsx
```

**Features:**
- Sortable lists (by quantity, urgency, value)
- Tap to create PO
- Tap to investigate (drill into history)
- Filter by category
- Tap threshold → auto-populate PO form

**UI (Low Stock):**
```
Low Stock

Product | Current | Min | Days | Action
─────────────────────────────────────
Rice    | 3       | 50  | 1    | [Order]
Oil     | 5       | 25  | 2    | [Order]
Sugar   | 7       | 30  | 3    | [Order]

[Bulk Order] [See Forecast]
```

### Week 3 Web

**Components:**
```typescript
// InventoryTable.tsx (sortable, filterable)
// DeadStockAnalysis.tsx (breakdown by age)
// ReorderForm.tsx (create PO from report)
```

**Features:**
- Interactive tables with sorting
- Charts showing dead stock by age
- One-click PO creation
- Email forecast to stakeholders

#### End of Week 3 Checklist

- [ ] Low Stock mobile & web ✓
- [ ] Dead Stock mobile & web ✓
- [ ] Forecast mobile & web ✓
- [ ] Create PO from reports ✓
- [ ] Mobile/web parity ✓

---

## Week 3-4: Stock Movement History + Product Performance

### Week 3 Backend

**Endpoints:**
```typescript
GET /reports/stock-movements?productId=&startDate=&endDate=
GET /reports/product-performance?period=7|30|90
GET /reports/product-performance/ranking?type=fastest|slowest|dead
```

**Database queries:**
```sql
-- Stock Movements
SELECT 
  al.created_at,
  al.action,
  p.name,
  CAST(al.old_values->>'quantity' as INTEGER) as before_qty,
  CAST(al.new_values->>'quantity' as INTEGER) as after_qty,
  CAST(al.new_values->>'quantity' as INTEGER) - 
    CAST(al.old_values->>'quantity' as INTEGER) as delta,
  u.name as user_name,
  al.reference
FROM audit_logs al
JOIN products p ON al.entity_id = p.id
JOIN users u ON al.user_id = u.id
WHERE al.action IN ('RECEIVE_GOODS', 'ISSUE_GOODS', 'TRANSFER')
  AND p.id = $1
  AND al.created_at BETWEEN $2 AND $3
ORDER BY al.created_at DESC;

-- Product Performance (by movement frequency)
SELECT 
  p.id, p.name,
  COUNT(al.id) as movement_count,
  SUM(CASE WHEN al.action = 'RECEIVE_GOODS' 
      THEN CAST(al.new_values->>'quantity' as INTEGER) - 
           CAST(al.old_values->>'quantity' as INTEGER)
      ELSE 0 END) as total_received,
  EXTRACT(DAY FROM NOW() - $1::DATE) as period_days
FROM products p
LEFT JOIN audit_logs al ON p.id = al.entity_id
  AND al.action IN ('RECEIVE_GOODS', 'ISSUE_GOODS')
  AND al.created_at BETWEEN $1 AND NOW()
WHERE p.company_id = $2
GROUP BY p.id, p.name
ORDER BY movement_count DESC;
```

### Week 3-4 Mobile

**Screens:**
```typescript
// StockMovementScreen.tsx (timeline view)
// ProductPerformanceScreen.tsx (ranking)
```

**Features:**
- Timeline view of movements (scrollable)
- Tap movement → see full audit trail
- Performance cards (fastest, slowest, dead)
- Category filtering

### Week 4 Web

**Components:**
```typescript
// StockMovementTimeline.tsx (visual timeline)
// PerformanceComparison.tsx (side-by-side charts)
// ProductAnalysis.tsx (detailed breakdown)
```

**Features:**
- Visual timeline (Recharts)
- Comparison charts
- Export movement history
- Trend analysis

#### End of Week 4 Checklist

- [ ] Stock Movements mobile & web ✓
- [ ] Product Performance mobile & web ✓
- [ ] Timeline visualization ✓
- [ ] Drill-down to audit ✓

---

## Week 4-5: Branch Comparison + Audit Analytics

### Week 4-5 Backend

**Endpoints:**
```typescript
GET /reports/branch-comparison
GET /reports/branch/:branchId/inventory
GET /reports/audit-analytics/price-changes
GET /reports/audit-analytics/user-activity
```

### Week 4 Mobile

**Minimal on mobile** (web-primary for complex comparisons)
```typescript
// BranchPerformanceScreen.tsx (simplified)
// UserActivityScreen.tsx (simplified)
```

### Week 5 Web

**Full analytics:**
```typescript
// BranchComparison.tsx (detailed tables/charts)
// PriceChangeHistory.tsx (timeline)
// UserActivityReport.tsx (detailed)
```

#### End of Week 5 Checklist

- [ ] Branch Comparison web ✓
- [ ] Audit Analytics web ✓
- [ ] User Activity tracking ✓

---

## Week 5-6: Attention Dashboard (The Killer Feature)

### Week 5 Backend

**Endpoint:**
```typescript
GET /reports/attention
```

**Response:**
```json
{
  "exceptions": [
    {
      "type": "LOW_STOCK",
      "severity": "CRITICAL",
      "count": 3,
      "items": ["Rice", "Oil", "Sugar"],
      "action": "create-po"
    },
    {
      "type": "PENDING_APPROVALS",
      "severity": "HIGH",
      "count": 5,
      "items": ["GR-230", "GR-231", ...],
      "action": "approve"
    },
    {
      "type": "DEAD_STOCK",
      "severity": "MEDIUM",
      "value": 210000,
      "action": "analyze"
    },
    {
      "type": "BRANCH_PERFORMANCE",
      "severity": "MEDIUM",
      "message": "Branch B sales down 20%",
      "action": "investigate"
    }
  ],
  "achievements": [
    {
      "type": "TARGET_MET",
      "message": "Daily revenue target achieved",
      "value": 45230
    }
  ]
}
```

### Week 5-6 Mobile & Web

**Single unified screen:**
```typescript
// AttentionDashboardScreen.tsx (mobile)
// AttentionDashboard.tsx (web)
```

**Features:**
- Exception cards (sortable by severity)
- Tap any exception → action
- Achievements shown
- Real-time updates

**UI:**
```
TODAY - Attention Dashboard

CRITICAL
⚠️ 3 products low stock
   [Quick Reorder]

HIGH
⚠️ 5 goods receipts pending
   [Approve All]

MEDIUM
⚠️ ₹2.1L dead stock
   [Investigate]

⚠️ Branch B down 20%
   [Compare Branches]

ACHIEVEMENTS
✅ Daily target met: ₹45,230
```

#### End of Week 6 Checklist

- [ ] Attention Dashboard mobile ✓
- [ ] Attention Dashboard web ✓
- [ ] All actions clickable ✓
- [ ] Real-time updates ✓
- [ ] Mobile/web parity ✓

---

## Week 6-7: Polish, Test, Optimize

### Mobile Polish

- [ ] Performance optimization (< 3s all screens)
- [ ] Offline support (Redux cache)
- [ ] Dark mode
- [ ] Accessibility (a11y)
- [ ] Loading states
- [ ] Error handling

### Web Polish

- [ ] Responsive design (mobile-friendly web)
- [ ] Dark mode
- [ ] Keyboard navigation
- [ ] Performance optimization
- [ ] Export functionality (CSV, PDF)
- [ ] Print layouts

### Testing

- [ ] Unit tests (services, components)
- [ ] Integration tests (API + DB)
- [ ] E2E tests (key user flows)
- [ ] Performance tests (< 3s load)
- [ ] Mobile testing (4G network simulation)

### Documentation

- [ ] API documentation (Swagger)
- [ ] Mobile dev guide
- [ ] Web dev guide
- [ ] User guide
- [ ] Support runbooks

#### End of Week 7 Checklist

- [ ] All 10 reports built (mobile & web)
- [ ] All tests passing
- [ ] Performance < 3 seconds
- [ ] Mobile/web parity 100%
- [ ] Documentation complete
- [ ] Ready for release

---

## Team Allocation

### Engineer 1 (Mobile Lead)
- Week 1-2: Executive Dashboard + Inventory mobile
- Week 2-3: Low Stock + Dead Stock mobile
- Week 3-4: Stock Movements + Performance mobile
- Week 4-5: Branch Comparison (minimal) mobile
- Week 5-6: Attention Dashboard mobile
- Week 6-7: Testing + optimization

### Engineer 2 (Web Lead)
- Week 1-2: Backend + Executive Dashboard web
- Week 2-3: Low Stock + Dead Stock web
- Week 3-4: Stock Movements + Performance web
- Week 4-5: Branch Comparison + Audit web
- Week 5-6: Attention Dashboard web
- Week 6-7: Testing + optimization

### Parallel Work

Both engineers work simultaneously:
- Mobile builds UI on mobile platform
- Web builds UI on web platform
- Same backend API
- Same data logic
- Both testing independently
- Both deploying in week 7

---

## Success Criteria

**Performance:**
- [ ] All screens load < 3 seconds
- [ ] Mobile works on 4G connection
- [ ] Web responsive at all breakpoints

**Functionality:**
- [ ] All 10 reports working
- [ ] Mobile & web show same data
- [ ] All drill-down links working
- [ ] All actions (create PO, approve, etc) working

**Quality:**
- [ ] No console errors
- [ ] Tests passing (>90% coverage)
- [ ] Accessibility score > 90
- [ ] No data inconsistencies

**User Experience:**
- [ ] Owner can understand business in 30 seconds
- [ ] Every screen is actionable
- [ ] No confusion about data
- [ ] Feels fast and responsive

---

## Rollout

- Week 7: Internal testing
- Week 8: Beta with 1 customer
- Week 9: General availability

