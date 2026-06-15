# Phase 3: Growth Roadmap

**Building with Confidence**

---

## Philosophy

Phase 1 built the foundation (audit infrastructure, transaction safety).

Phase 2 proved it works (live E2E, health endpoints, backups, rate limiting).

Phase 3 grows the value (reports, workers, notifications).

**Key principle:** You now have observability, auditability, and recoverability. You can add features without fear. Every feature automatically gets:

- Audit trail (who did what)
- Health monitoring (is it working?)
- Rollback capability (restore from backup)

---

## Priority Order

### Priority 1: Reports & Analytics ⭐⭐⭐⭐⭐

**Why first:**
- Highest immediate business value
- Uses data you already have (162+ audit logs, products, inventory)
- Creates competitive differentiation
- Drives adoption

**What to build:**

#### 1.1 Inventory Valuation Report

```
Inventory Value by Company

┌──────────────┬──────────┬─────────┬──────────┐
│ Product      │ Qty      │ Unit    │ Total    │
├──────────────┼──────────┼─────────┼──────────┤
│ Widget A     │ 150      │ $45.50  │ $6,825   │
│ Widget B     │ 89       │ $32.00  │ $2,848   │
│ Gizmo X      │ 23       │ $125.00 │ $2,875   │
└──────────────┴──────────┴─────────┴──────────┘

Total Inventory Value: $12,548
```

**Implementation:**
- Query: `SELECT SUM(quantity * unit_cost) FROM products WHERE company_id = ?`
- Export: CSV, PDF
- Frequency: On-demand, weekly email option
- Audience: Finance, management

#### 1.2 Stock Movement History

```
Goods Receipt → Approval → Inventory Update

Timeline view of every movement with:
- Date
- Type (GR, GI, Transfer, Damage)
- Quantity
- User
- Approval status
- Audit trail link
```

**Implementation:**
- Query audit_logs for RECEIVE_GOODS, ISSUE_GOODS, TRANSFER
- Show before/after state
- Link to full audit trail
- Filter by date, product, user

#### 1.3 Low Stock Report

```
Products Below Minimum Level

┌──────────────┬──────────┬─────────┬────────┐
│ Product      │ Current  │ Minimum │ Status │
├──────────────┼──────────┼─────────┼────────┤
│ Widget A     │ 5        │ 50      │ 🔴 LOW │
│ Gizmo X      │ 2        │ 10      │ 🔴 LOW │
│ Component B  │ 45       │ 30      │ 🟡 WARN│
└──────────────┴──────────┴─────────┴────────┘
```

**Implementation:**
- Query: `SELECT * FROM products WHERE quantity < min_quantity`
- Auto-email option (daily/weekly)
- SMS alert option
- Integration with notifications (Phase 3.3)

#### 1.4 Top-Selling Products (Audit-Based)

```
Based on RECEIVE_GOODS quantity (proxy for sales):

Product      | 7-day | 30-day | 90-day | Trend
-------------|-------|--------|--------|-------
Widget A     | 150   | 580    | 1,850  | ↑↑ Hot
Gizmo X      | 45    | 210    | 890    | ↑ Growing
Component C  | 12    | 45     | 180    | → Stable
```

**Implementation:**
- Query: `SELECT entity_id, COUNT(*) FROM audit_logs WHERE action = 'RECEIVE_GOODS' GROUP BY entity_id`
- Time periods: 7, 30, 90 days
- Trend calculation: (current - previous) / previous
- Visualization: bar chart, sparklines

#### 1.5 Audit Activity Dashboard

```
System Activity Timeline

Time Range:  Last 7 Days  [📊 Filter]

CREATE_PRODUCT       152  ████████████████████░░░
LOGIN                 42  █████░░░░░░░░░░░░░░░░░░
APPROVE               18  ██░░░░░░░░░░░░░░░░░░░░░
UPDATE_PRODUCT        12  █░░░░░░░░░░░░░░░░░░░░░░

Users Active:  8
Companies:     6
Transactions:  184
```

**Implementation:**
- Query: `SELECT action, COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY action`
- Show by action, by user, by company
- Drill-down to individual logs
- Export for compliance

---

### Priority 2: Background Workers ⭐⭐⭐⭐

**Why second:**
- Enables notifications, alerts, scheduled reports
- Uses existing audit infrastructure
- You already have Redis + Bull (job queue)

**What to build:**

#### 2.1 Low Stock Alert Worker

```
Daily Job (2:30 AM after backup)

For each company:
  Find products below minimum
  Create LowStockAlert record
  Queue notification
  Audit: ALERT_LOW_STOCK created
```

**Implementation:**

```typescript
// Worker: daily-low-stock-alerts.ts
export const dailyLowStockAlerts = async () => {
  const products = await prisma.product.findMany({
    where: { quantity: { lt: prisma.raw('min_quantity') } },
  });

  for (const product of products) {
    // Audit the alert creation
    await auditService.log({
      action: 'ALERT_LOW_STOCK',
      entityType: 'product',
      entityId: product.id,
      oldValues: null,
      newValues: { quantity: product.quantity, threshold: product.minQuantity },
      companyId: product.companyId,
    });

    // Queue notification
    await notificationQueue.add('low-stock-alert', {
      productId: product.id,
      companyId: product.companyId,
    });
  }
};
```

**Schedule:** Daily at 2:30 AM (via Bull-MQ)

#### 2.2 Backup Notification Worker

```
After backup completes:
  Read backup log
  If success: notify admin
  If failed: alert admin (urgent)
```

**Implementation:**

```typescript
// On backup success
setTimeout(() => {
  notificationQueue.add('backup-success', {
    size: '136 KB',
    date: new Date(),
  });
}, 1000); // 1 second after backup completes
```

#### 2.3 Scheduled Report Worker

```
Weekly reports (every Sunday 8 AM):
  Generate inventory valuation
  Generate top products
  Email to management
  Audit: REPORT_GENERATED
```

**Implementation:**

```typescript
// Weekly job
0 8 * * 0 generate-weekly-reports

// Creates:
// - Inventory valuation PDF
// - Low stock CSV
// - Activity summary
// - Audit trail for report generation
```

#### 2.4 Subscription Renewal Reminder (if applicable)

```
30 days before expiry:
  Check subscription.expiresAt
  Queue reminder email
  Audit: SUBSCRIPTION_REMINDER sent
```

---

### Priority 3: Notifications ⭐⭐⭐

**Why third:**
- Depends on workers and events
- You have the event stream (audit logs)

**What to build:**

#### 3.1 Product Price Changed Alert

```
Trigger: UPDATE_PRODUCT action with price change
Event:   Product price changed from $45 to $52
Alert:   Email to finance team + in-app notification
Audit:   Update logged, notification queued, notification sent
```

**Implementation:**

```typescript
// In product.service.ts on price update
await auditService.log({
  action: 'UPDATE_PRODUCT',
  oldValues: { price: 45 },
  newValues: { price: 52 },
  entityId: product.id,
});

// Trigger notification
if (oldPrice !== newPrice) {
  await notificationQueue.add('price-changed', {
    productId: product.id,
    oldPrice,
    newPrice,
    companyId: product.companyId,
  });
}
```

#### 3.2 Goods Receipt Approved Notification

```
Trigger: APPROVE action on goods receipt
Event:   GR #GR-001 approved by Manager
Alert:   Warehouse notified → can process
Audit:   Approval logged, notification sent
```

#### 3.3 Stock Below Threshold Alert

```
Trigger: Daily worker finds low stock
Event:   Widget A now 5 units (minimum: 50)
Alert:   Procurement team → create PO
Audit:   Alert created, notification sent
```

#### 3.4 Login from New Device

```
Trigger: LOGIN action from new IP/device
Event:   Login from new device detected
Alert:   User gets email: "Did you log in from this device?"
Audit:   Login logged with device info
```

---

## Feature Dependencies

```
Phase 3 Feature Map

Reports & Analytics (Priority 1)
  ├─ Inventory Valuation
  ├─ Stock Movement History
  ├─ Low Stock Report
  ├─ Top-Selling Products
  └─ Audit Activity Dashboard

Background Workers (Priority 2)
  ├─ Low Stock Alert Worker
  │   └─ depends on: Low Stock Report (Phase 3.1.3)
  ├─ Backup Notification Worker
  │   └─ depends on: Backup system (Phase 2 ✓)
  ├─ Scheduled Report Worker
  │   └─ depends on: Reports & Analytics (Phase 3.1)
  └─ Subscription Renewal Worker

Notifications (Priority 3)
  ├─ Price Changed Alert
  ├─ Receipt Approved Alert
  ├─ Low Stock Alert
  │   └─ depends on: Low Stock Alert Worker (Phase 3.2.1)
  ├─ Login from New Device Alert
  └─ Notification Center (UI)
      └─ depends on: Notification system
```

---

## Implementation Strategy

### Phase 3.1: Reports & Analytics (Weeks 1-3)

**Week 1: Foundation**
- Create `ReportsModule`
- Implement core queries (inventory valuation, stock movement)
- Create `ReportService` with reusable queries
- Add unit tests

**Week 2: UI & Export**
- Create report pages (React components)
- Implement CSV/PDF export
- Add charts (recharts)
- Add filters (date range, company, product)

**Week 3: Scheduling & Email**
- Add email sending (mailgun/sendgrid)
- Implement email templates
- Add scheduled report generation
- Audit report generation

### Phase 3.2: Workers (Weeks 4-5)

**Week 4: Job Queue Setup**
- Review Bull-MQ configuration
- Create job processors
- Add error handling & retries
- Test with manual triggers

**Week 5: Worker Implementations**
- Low stock alert worker
- Backup notification worker
- Scheduled report worker
- Add worker monitoring

### Phase 3.3: Notifications (Weeks 6-7)

**Week 6: Core Notifications**
- Create `NotificationService` enhancements
- Implement notification templates
- Add SMS/Email/In-App channels
- Audit notification sending

**Week 7: UI & Delivery**
- Build notification center (inbox view)
- Add notification preferences (user can opt-in/out)
- Implement delivery retries
- Add notification archive

---

## Technical Requirements

### New Dependencies (if needed)

```bash
# PDF generation
npm install pdfkit

# Email
npm install nodemailer sendgrid

# Charts (already have recharts on frontend)
npm install chart.js react-chartjs-2

# Job scheduling (already have bull)
npm install bull-board  # UI for Bull

# SMS (optional)
npm install twilio
```

### Database Queries to Add

```sql
-- Reports
SELECT id, name, quantity, unit_cost, quantity * unit_cost as value 
FROM products 
WHERE company_id = $1;

-- Movements
SELECT action, entity_id, old_values, new_values, created_at 
FROM audit_logs 
WHERE entity_type = 'product' AND company_id = $1 
ORDER BY created_at DESC;

-- Low stock
SELECT id, name, quantity, min_quantity 
FROM products 
WHERE company_id = $1 AND quantity < min_quantity;

-- Top products (by audit count)
SELECT entity_id, COUNT(*) as activity 
FROM audit_logs 
WHERE action = 'RECEIVE_GOODS' AND company_id = $1 
GROUP BY entity_id 
ORDER BY activity DESC 
LIMIT 10;
```

---

## Metrics to Track

### Reports & Analytics
- Report generation time (should be < 5s)
- Export file size (CSV < 1 MB, PDF < 5 MB)
- User engagement (which reports are accessed)
- Email delivery rate (if scheduled reports)

### Workers
- Job queue depth (backlog of jobs)
- Job success rate (% completed successfully)
- Job duration (time from queue to completion)
- Retry rate (% of jobs that needed retries)

### Notifications
- Delivery rate (% delivered vs queued)
- User engagement (% read vs delivered)
- Notification latency (queue to delivery)
- Channel distribution (Email vs SMS vs In-App)

---

## Rollout Plan

### Internal Testing (Week 1-2)
- Use staging database with test data
- Your team tests features
- Verify audit trails

### Beta Rollout (Week 3)
- One test customer gets access
- Monitor for issues
- Gather feedback

### General Availability (Week 4)
- Release to all customers
- Monitor metrics
- Support tickets on standby

---

## When Phase 3 is Complete

```
Phase 1 — Core Confidence
██████████ 100%
✓ Audit infrastructure proven

Phase 2 — Operational Confidence  
██████████ 100%
✓ System recoverable
✓ Health observable

Phase 3 — Growth (100%)
██████████ 100%
✓ Reports create business value
✓ Workers automate routine tasks
✓ Notifications drive engagement
✓ System scales with feature-richness

Phase 4 — Enterprise
░░░░░░░░░░ 0%
→ Ready when business needs it
```

---

## Open Questions to Answer First

1. **Email Service:** Use Mailgun, SendGrid, or SMTP?
2. **SMS Notifications:** Include SMS alerts or email-only?
3. **Report Frequency:** Daily, weekly, or on-demand?
4. **Chart Library:** Use recharts (client) or server-side PDF charts?
5. **Notification Persistence:** Keep notification history forever or archive after 30 days?
6. **User Preferences:** Let users opt-out of specific alerts?
7. **Timezone Handling:** Convert report times to user's timezone or server timezone?
8. **Multi-language:** Support multiple languages in reports/notifications?

---

## Success Criteria

Phase 3 is complete when:

- ✅ All 5 reports exist and export correctly
- ✅ All 4 workers run on schedule
- ✅ All 4 notification types deliver reliably
- ✅ Audit logs show all actions
- ✅ Users can be notified without overwhelming them
- ✅ Metrics show healthy system (>95% success rates)
- ✅ Customers report feature requests (not bugs)

---

**Start date:** After Phase 2 closure  
**Timeline:** 7 weeks (aggressive) or 10 weeks (sustainable)  
**Team:** 1-2 engineers  
**Risk level:** Low (heavy reuse of existing infrastructure)

