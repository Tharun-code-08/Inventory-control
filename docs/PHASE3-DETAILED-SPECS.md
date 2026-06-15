# Phase 3: Detailed Feature Specifications

**Building features customers will notice and pay for**

---

## Week 1-2: Reports & Analytics ⭐⭐⭐⭐⭐

### 1.1 Inventory Valuation Report

**Questions answered:**
- Total inventory value?
- Value by warehouse?
- Value by category?
- Dead stock value?

**API Endpoints:**
```
GET /reports/inventory-valuation
GET /reports/inventory-valuation/export?format=csv|pdf
```

**Response:**
```json
{
  "totalValue": 1432500,
  "currency": "INR",
  "byWarehouse": {
    "Warehouse A": 780000,
    "Warehouse B": 652500
  },
  "byCategory": {
    "Rice": 450000,
    "Oil": 320000,
    "Sugar": 180000
  },
  "deadStock": {
    "value": 112000,
    "products": 5
  },
  "timestamp": "2026-06-13T11:30:00Z"
}
```

**UI:**
```
Inventory Valuation Report

Total Value: ₹ 14,32,500

By Warehouse
├─ Warehouse A   ₹ 7,80,000   (54.4%)
├─ Warehouse B   ₹ 6,52,500   (45.6%)

By Category
├─ Rice          ₹ 4,50,000   (31.4%)
├─ Oil           ₹ 3,20,000   (22.3%)
├─ Sugar         ₹ 1,80,000   (12.6%)
└─ Other         ₹ 4,82,500   (33.7%)

Dead Stock
├─ Dead items:    5 products
├─ Dead value:    ₹ 1,12,000   (7.8%)
└─ [Flag for removal]
```

**Database Query:**
```sql
SELECT 
  p.id,
  p.name,
  p.quantity,
  p.unit_cost,
  (p.quantity * p.unit_cost) as value,
  c.name as category,
  w.name as warehouse,
  CASE WHEN p.quantity = 0 THEN 'DEAD' ELSE 'ACTIVE' END as status
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN warehouses w ON p.warehouse_id = w.id
WHERE p.company_id = $1
ORDER BY value DESC;
```

**Implementation:**
- Create `ReportService.inventoryValuation(companyId, filters)`
- Add export handler (CSV: simple, PDF: use pdfmake)
- Cache results for 1 hour (reports are expensive)

---

### 1.2 Stock Movement Report

**Shows:**
- Date
- Product
- Before Qty
- Movement (type + qty)
- After Qty
- Reference (GR-001, etc)
- User who made change

**Data Source:** Use existing audit logs (action = RECEIVE_GOODS, ISSUE_GOODS, TRANSFER)

**API:**
```
GET /reports/stock-movements?productId=&startDate=&endDate=&format=csv|pdf
```

**Response:**
```json
{
  "movements": [
    {
      "date": "2026-06-13T10:30:00Z",
      "product": "Rice",
      "beforeQty": 150,
      "type": "RECEIVE_GOODS",
      "quantity": 100,
      "afterQty": 250,
      "reference": "GR-230",
      "user": "Warehouse Manager",
      "auditId": "audit-uuid"
    },
    {
      "date": "2026-06-13T09:15:00Z",
      "product": "Rice",
      "beforeQty": 200,
      "type": "ISSUE_GOODS",
      "quantity": 50,
      "afterQty": 150,
      "reference": "GI-045",
      "user": "Warehouse Staff",
      "auditId": "audit-uuid"
    }
  ]
}
```

**UI:**
```
Stock Movement Report

Product: Rice ▼  From: [date] To: [date]  [Export CSV] [Export PDF]

Date       | Type          | Qty    | Before | After | Ref    | By
-----------|---------------|--------|--------|-------|--------|------------------
13 Jun 10:30 | Goods Receipt | +100  | 150    | 250   | GR-230 | Warehouse Manager
13 Jun 09:15 | Goods Issue   | -50   | 200    | 150   | GI-045 | Warehouse Staff
13 Jun 08:00 | Transfer      | +25   | 175    | 200   | ST-015 | Manager
```

**Database Query:**
```sql
SELECT 
  al.created_at,
  al.action,
  al.entity_id,
  p.name,
  (al.new_values->>'quantity')::int as new_qty,
  (al.old_values->>'quantity')::int as old_qty,
  ((al.new_values->>'quantity')::int - (al.old_values->>'quantity')::int) as delta,
  al.reference,
  u.name as user_name
FROM audit_logs al
JOIN products p ON al.entity_id = p.id
JOIN users u ON al.user_id = u.id
WHERE al.action IN ('RECEIVE_GOODS', 'ISSUE_GOODS', 'TRANSFER')
  AND al.company_id = $1
  AND al.created_at BETWEEN $2 AND $3
ORDER BY al.created_at DESC;
```

---

### 1.3 Low Stock Report

**Shows products below minimum:**

**API:**
```
GET /reports/low-stock?threshold=&format=csv|pdf
POST /reports/low-stock/email?frequency=daily|weekly|never
```

**Response:**
```json
{
  "lowStock": [
    {
      "product": "Rice",
      "currentQty": 3,
      "minimumQty": 50,
      "shortage": 47,
      "category": "Grains",
      "lastReceived": "2026-06-01",
      "urgency": "CRITICAL"
    },
    {
      "product": "Oil",
      "currentQty": 5,
      "minimumQty": 25,
      "shortage": 20,
      "category": "Oils",
      "lastReceived": "2026-05-25",
      "urgency": "HIGH"
    }
  ]
}
```

**UI:**
```
Low Stock Report

[Enable Auto Email: Daily ▼] [Save Preference]

Threshold: [Manual Override]

Product    | Current | Min | Shortage | Days Since | Action
-----------|---------|-----|----------|------------|--------
Rice       | 3       | 50  | -47      | 12 days    | [Create PO]
Oil        | 5       | 25  | -20      | 18 days    | [Create PO]
Sugar      | 7       | 30  | -23      | 8 days     | [Create PO]
```

**Features:**
- Auto-email daily/weekly (configurable per user)
- One-click PO creation for low stock
- SMS alerts for critical items
- Linked to notification system

---

### 1.4 Product Performance Report

**Shows:**
- Most moved products (by frequency)
- Fastest moving (qty per day)
- Slow moving (not moved in X days)
- Dead stock (zero qty for 30+ days)

**API:**
```
GET /reports/product-performance?period=7|30|90
GET /reports/product-performance/ranking?type=fastest|slowest|dead
```

**Response:**
```json
{
  "fastestMoving": [
    {
      "product": "Rice",
      "movements": 45,
      "totalQty": 850,
      "avgDaily": 12.14,
      "trend": "↑↑ Accelerating"
    }
  ],
  "slowestMoving": [
    {
      "product": "Exotic Spice A",
      "movements": 2,
      "totalQty": 50,
      "avgDaily": 0.71,
      "trend": "↓ Declining"
    }
  ],
  "deadStock": [
    {
      "product": "Old Product",
      "qty": 15,
      "value": 1500,
      "daysSinceMove": 180,
      "recommendation": "Discontinue or discount"
    }
  ]
}
```

**UI:**
```
Product Performance

Most Moved (Last 30 Days)
┌─────────────────┬────────┬─────────┬────────┐
│ Product         │ Moves  │ Qty/day │ Trend  │
├─────────────────┼────────┼─────────┼────────┤
│ Rice            │ 45     │ 12.14   │ ↑↑     │
│ Oil             │ 32     │ 8.57    │ ↑      │
│ Sugar           │ 18     │ 4.29    │ →      │
└─────────────────┴────────┴─────────┴────────┘

Slow Moving
│ Exotic Spice A  │ 2      │ 0.71    │ ↓      │

Dead Stock (30+ days no movement)
│ Old Product     │ 15 qty │ ₹1,500  │ Remove │
```

---

## Week 3: Background Workers ⭐⭐⭐⭐

**Create:** `apps/api/src/workers/`

**Use:** BullMQ + Redis (already deployed)

### 3.1 Low Stock Monitor (Hourly)

```typescript
// workers/low-stock-monitor.ts
export const lowStockMonitorJob = async () => {
  const lowStockProducts = await prisma.product.findMany({
    where: {
      quantity: { lt: prisma.raw('min_quantity') }
    }
  });

  for (const product of lowStockProducts) {
    // Audit the alert
    await auditService.log({
      action: 'ALERT_LOW_STOCK',
      entityType: 'product',
      entityId: product.id,
      newValues: { 
        quantity: product.quantity,
        minimum: product.minQuantity 
      },
      companyId: product.companyId
    });

    // Queue notification
    await notificationQueue.add('low-stock-alert', {
      productId: product.id,
      companyId: product.companyId,
      quantity: product.quantity,
      minimum: product.minQuantity
    });
  }
};

// Schedule: every hour
// In crontab: 0 * * * * (or use Bull's cron)
```

### 3.2 Backup Verification (After backup completes)

```typescript
// workers/backup-verification.ts
export const backupVerificationJob = async () => {
  // Check latest backup exists
  const latestBackup = await getLatestBackup();
  
  if (!latestBackup) {
    await auditService.log({
      action: 'HEALTH_CHECK_FAILED',
      entityType: 'system',
      entityId: 'backup',
      newValues: { status: 'MISSING' }
    });
    
    // Alert admin
    await notificationQueue.add('backup-missing', {
      severity: 'CRITICAL'
    });
    return;
  }

  // Try restore
  const restoreResult = await runRestoreTest(latestBackup);
  
  if (!restoreResult.success) {
    await notificationQueue.add('backup-restore-failed', {
      severity: 'CRITICAL',
      error: restoreResult.error
    });
  } else {
    await auditService.log({
      action: 'HEALTH_CHECK_PASSED',
      entityType: 'system',
      entityId: 'backup',
      newValues: { status: 'OK', lastVerified: new Date() }
    });
  }
};

// Schedule: daily at 3:00 AM (after 2:00 AM backup)
```

### 3.3 Scheduled Reports (Daily morning)

```typescript
// workers/scheduled-reports.ts
export const scheduledReportsJob = async () => {
  const users = await prisma.user.findMany({
    where: { reports_enabled: true }
  });

  for (const user of users) {
    // Generate reports
    const inventoryReport = await reportService.inventoryValuation(user.companyId);
    const lowStockReport = await reportService.lowStock(user.companyId);
    
    // Convert to PDF
    const pdf = await generateReportPDF({
      inventory: inventoryReport,
      lowStock: lowStockReport
    });

    // Send email
    await emailService.send({
      to: user.email,
      subject: 'Daily Inventory Report',
      attachments: [pdf]
    });

    // Audit
    await auditService.log({
      action: 'REPORT_GENERATED',
      entityType: 'report',
      entityId: 'daily-inventory',
      userId: user.id,
      companyId: user.companyId,
      newValues: { recipients: [user.email], timestamp: new Date() }
    });
  }
};

// Schedule: daily at 8:00 AM
```

---

## Week 4: Notification Center ⭐⭐⭐⭐

**Event → Audit → Notification flow already exists**

### 4.1 Notification Types

**Inventory Events:**
```
LOW_STOCK       "Rice below threshold (3/50)"
OUT_OF_STOCK    "Oil out of stock"
STOCK_RECEIVED  "Goods receipt GR-230 approved"
STOCK_TRANSFER  "Stock transfer to Warehouse B"
```

**Workflow Events:**
```
APPROVAL_REQUIRED  "Goods Receipt GR-230 pending approval"
APPROVED           "Your GR-230 has been approved"
REJECTED           "Goods Receipt GR-230 rejected"
ESCALATION         "Approval overdue - escalating"
```

**Security Events:**
```
NEW_DEVICE_LOGIN        "Login from new device: Chrome on Windows"
PASSWORD_CHANGED        "Your password was changed"
MULTIPLE_LOGIN_FAILURES "5 failed login attempts"
PERMISSION_CHANGE       "Your role was changed to Manager"
```

### 4.2 API Endpoints

```typescript
GET /notifications
  → Returns paginated list
  Response: { items: [{id, type, title, body, read, createdAt}], total, page }

GET /notifications/:id
  → Returns single notification with full details

POST /notifications/:id/read
  → Mark as read

POST /notifications/read-all
  → Mark all as read

GET /notifications/preferences
  → Show user's notification settings

POST /notifications/preferences
  → Update settings (which types to receive, via email/SMS/in-app)

DELETE /notifications/:id
  → Archive/delete notification
```

### 4.3 Mobile UI

```
🔔 Notifications (3 unread)

[LOW STOCK]
Rice below threshold (3/50)
20 minutes ago

[APPROVAL]
Goods Receipt GR-230 needs approval
1 hour ago

[SECURITY]
New device login: Mobile Safari
2 hours ago

[Mark all as read]
```

---

## Week 5: Dashboard 2.0 ⭐⭐⭐⭐⭐

**What users see first.**

### 5.1 Key Metrics

```
Dashboard

Revenue                    Inventory Value
₹ 5,42,100                ₹ 14,32,500
↑ 12% vs last month        ↑ 3% vs last month


Pending Approvals          Low Stock Items
3 GR pending              2 critical products
[View All]                [View Report]


Goods Received Today       Stock Transfers Today
5 GR processed            2 transfers in progress


Active Users
8 users online
```

### 5.2 Charts

```
[Inventory Value Trend]  [Last 30 days]
14.5M ┤                 ╱─────╲
14.0M ┤      ╱──────────╯       ╲
13.5M ┤ ────╱
      └──────────────────────────

[Goods Receipt Trend]
100 ┤    ╱╲
    │   ╱  ╲╱╲
50  │  ╱    ╲  ╲
    │ ╱      ╲  ╲
    └─────────────

[Approval Status]
Pending: 3 (25%)
Approved: 9 (75%)
```

### 5.3 UI Layout

```
Dashboard

[Filter by warehouse/category] [Last 7 days ▼] [Export ▼]

KPI Cards (row 1)
├─ Revenue        (trend indicator)
├─ Inventory Value (trend indicator)
├─ Pending Items   (link to approvals)
└─ Low Stock       (link to report)

Charts (row 2)
├─ Inventory Value Trend (line chart)
├─ Goods Receipt Trend   (bar chart)

Charts (row 3)
├─ Stock Movement Trend (area chart)
├─ Approval Status      (pie chart)

Recent Activity (row 4)
├─ Last 5 goods receipts
├─ Last 5 approvals
├─ Last 5 stock movements
```

---

## Week 6: PDF & Excel Export ⭐⭐⭐⭐

### 6.1 PDF Generation

```typescript
// Generate: Goods Receipts, Purchase Orders, Stock Transfers, Audit Reports

GET /pdf/goods-receipt/:id
GET /pdf/stock-transfer/:id
GET /pdf/audit-report/:id?startDate=&endDate=

// Library: pdfmake
```

**Example Goods Receipt PDF:**
```
┌────────────────────────────────┐
│  GOODS RECEIPT                 │
│  GR-230                        │
│  Date: 13 Jun 2026            │
├────────────────────────────────┤
│ From: Supplier ABC            │
│ To: Warehouse A               │
│ Received by: John Smith       │
│                               │
│ Items:                        │
│ ─────────────────────────────│
│ Rice          100 bags        │
│ Oil           50 liters       │
│ Sugar         75 kg           │
│                               │
│ Total Value: ₹ 15,000         │
│ Status: APPROVED              │
│ Approved by: Manager          │
│ Approval date: 13 Jun 2026    │
└────────────────────────────────┘
```

### 6.2 Excel Export

```typescript
GET /export/inventory?format=xlsx
GET /export/audit-logs?startDate=&endDate=&format=xlsx
GET /export/stock-movements?format=xlsx

// Library: exceljs
```

**Example Excel: Inventory.xlsx**
```
| Product      | Qty  | Unit Cost | Value    | Warehouse   | Status   |
|--------------|------|-----------|----------|-------------|----------|
| Rice         | 250  | 45.50     | 11,375   | Warehouse A | ACTIVE   |
| Oil          | 85   | 125.00    | 10,625   | Warehouse B | ACTIVE   |
| Dead Product | 15   | 100.00    | 1,500    | Warehouse A | DEAD     |
```

---

## Week 7: Global Search ⭐⭐⭐⭐

**Search across everything.**

### 7.1 Search API

```typescript
GET /search?q=rice
GET /search?q=GR-230
GET /search?q=john

Response:
{
  "results": [
    {
      "type": "product",
      "id": "prod-123",
      "title": "Rice",
      "subtitle": "1000 bags in stock",
      "url": "/products/prod-123"
    },
    {
      "type": "goods-receipt",
      "id": "gr-230",
      "title": "GR-230",
      "subtitle": "Received 13 Jun, 100 bags rice",
      "url": "/goods-receipts/gr-230"
    },
    {
      "type": "audit-log",
      "id": "audit-uuid",
      "title": "Product created: Rice",
      "subtitle": "by John Smith on 01 May",
      "url": "/audit/audit-uuid"
    },
    {
      "type": "user",
      "id": "user-123",
      "title": "John Smith",
      "subtitle": "Warehouse Manager",
      "url": "/users/user-123"
    }
  ]
}
```

### 7.2 Search UI

```
Search

[rice              ] 🔍

Results (4)

PRODUCTS
├─ Rice - 250 bags in Warehouse A

GOODS RECEIPTS
├─ GR-230 - Received 13 Jun, 100 bags

AUDIT LOGS
├─ Product created: Rice - by John Smith on 01 May

USERS
├─ John Smith - Warehouse Manager
```

---

## Phase 3 Checklist

- [ ] Week 1-2: All 4 reports (Inventory, Movements, Low Stock, Performance)
- [ ] Week 2: Report export (CSV, PDF)
- [ ] Week 3: Background workers (Low Stock, Backup Verify, Scheduled Reports)
- [ ] Week 4: Notification center with 10+ notification types
- [ ] Week 5: Dashboard 2.0 with KPIs and charts
- [ ] Week 6: PDF & Excel export for documents
- [ ] Week 7: Global search across all entities

**Success Criteria:**
- ✅ Reports generate in < 5 seconds
- ✅ Workers process without errors
- ✅ Notifications deliver reliably (>99%)
- ✅ Dashboard loads in < 2 seconds
- ✅ Export files < 10 MB
- ✅ Search returns results < 1 second

---

**Timeline:** 7 weeks  
**Team:** 1-2 engineers  
**Risk:** Low (no new infrastructure)  
**ROI:** High (customers see immediate value)
