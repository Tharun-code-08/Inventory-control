# Phase 3: Focused MVP (3-6 Months)

**Goal: Owner opens dashboard and says "I can run my company from here"**

---

## The Principle

Don't build 30 features.  
Don't build 12 modules.

Build **7 focused modules** that answer the questions owners actually ask:

```
Can I see how much money I made today?
What inventory is stuck?
Which products are profitable?
Are my suppliers reliable?
How are my branches performing?
What's happening in my business?
When will things run out?
```

---

## Module 1: Executive Dashboard ⭐⭐⭐⭐⭐

**Question:** "What do I need to know right now?"

**One Screen Shows:**

### Financial Health
```
Revenue Today           ₹1,20,000
Revenue This Month      ₹32,50,000
Gross Profit (%)       22%
Net Profit             ₹7,15,000
Outstanding Receivables ₹5,60,000
Outstanding Payables    ₹3,20,000
Cash Balance           ₹8,50,000
```

### Inventory Health
```
Inventory Value        ₹18,00,000
Dead Stock Value       ₹80,000
Fast Moving Products   12 items
Low Stock Items        4 items
Stock Accuracy         98.7%
Inventory Turnover     8x/year
```

### Operations Status
```
Pending Approvals      3 GRs
Delayed Receipts       1 (overdue 2 days)
Failed Deliveries      0
Transfers In Progress  2
```

### Security
```
Failed Logins Today    2
New Devices            0
Suspicious Activities  0
Audit Exports          1
```

**What Owner Knows in 30 Seconds:**
- Business is healthy or under stress
- Where money is, where it's stuck
- What needs immediate action
- No issues in operations/security

**API:** `GET /dashboard/executive-summary`

---

## Module 2: Inventory Intelligence ⭐⭐⭐⭐⭐

**Question:** "Where is my money stuck and what will run out?"

### Part A: Stock Status (Not Just Quantity)

**Wrong:**
```
Rice: 120 units
```

**Right:**
```
Rice

Current Stock:        120 units
Normal Demand:        25 units/day
Days of Stock:        4.8 days
Lead Time:            3 days
Status:               ⚠️ WARNING (will stock out in 2 days)

Suggested Reorder:    200 units
Suggested Supplier:   ABC Traders (best on-time delivery)
Confidence:           92%

[Create Purchase Order]
```

### Part B: Inventory Aging Report

```
0-30 Days              ₹2,10,000    (12%)
31-90 Days             ₹5,80,000    (32%)
91-180 Days            ₹1,90,000    (10%)
180+ Days              ₹70,000      (4%)

TOTAL AGING > 90 DAYS  ₹2,60,000    (14%)
```

Click 180+ Days:
```
Product    | Qty | Value    | Warehouse | Supplier     | Days | Action
-----------|-----|----------|-----------|--------------|------|--------
Old Spice  | 50  | ₹50,000  | A         | ABC Traders  | 340  | Remove
Old Brand  | 30  | ₹20,000  | B         | XYZ Corp     | 280  | Discount
```

### Part C: Dead Stock Analysis

```
No Movement For:

90 Days               5 products      ₹45,000
180 Days             3 products      ₹28,000
365 Days             1 product       ₹5,000

TOTAL BLOCKED        ₹78,000

Action: [Discount] [Remove] [Donate]
```

### Part D: Inventory Turnover (Velocity)

```
Fast Moving (>10x/year)
Rice          14 turns
Oil           9 turns
Salt          12 turns

Slow Moving (<3x/year)
Sugar         3 turns
Exotic Spice  1 turn

Owner Knows: Rice is your business. Sugar is your problem.
```

**What Owner Knows:**
- Exactly what will run out and when
- Exactly what money is stuck
- Why it's stuck (too old, no demand, wrong supplier)
- What action to take

**APIs:**
```
GET /reports/inventory-status
GET /reports/inventory-aging
GET /reports/dead-stock
GET /reports/inventory-turnover
```

---

## Module 3: Profit Intelligence ⭐⭐⭐⭐⭐⭐

**Question:** "What's actually making me money?"

### Part A: High-Level Summary

```
Sales                 ₹10,00,000
Cost of Goods Sold    ₹7,00,000
Gross Profit          ₹3,00,000
Gross Profit %        30%

Operating Expenses    ₹60,000
Net Profit            ₹2,40,000
Net Profit %          24%
```

### Part B: Product Profitability

```
Product   | Purchase | Selling | Margin | Volume | Total Profit
----------|----------|---------|--------|--------|---------------
Rice      | ₹80      | ₹120    | 33%    | 2,300  | ₹92,000
Oil       | ₹250     | ₹350    | 28%    | 800    | ₹80,000
Sugar     | ₹40      | ₹55     | 27%    | 1,200  | ₹18,000
Spices    | ₹500     | ₹650    | 23%    | 100    | ₹15,000

Top Profit: Rice ₹92,000 (38% of profit)
Worst Profit: Spices ₹15,000 (6% of profit)
```

Click "Rice":
```
Purchase Price: ₹80
Supplier: ABC Traders
Best Price: ₹78 (from competitor)
Action: Negotiate with ABC or switch supplier
```

### Part C: Supplier Profit Impact

```
Most Profitable Supplier: ABC Traders (rice, oil)
Least Profitable:        XYZ Corp (exotic spices - low volume)

Supplier A helps you make ₹1,50,000
Supplier B helps you make ₹85,000
Supplier C helps you make ₹5,000

Action: Consolidate suppliers or drop C
```

**What Owner Knows:**
- Exactly which products are cash generators
- Exactly which are money losers
- Which suppliers enable profit
- Where to negotiate harder

**APIs:**
```
GET /reports/profit-summary
GET /reports/product-profitability
GET /reports/supplier-profitability
```

---

## Module 4: Supplier Intelligence ⭐⭐⭐⭐⭐⭐

**Question:** "Are my suppliers reliable? Should I switch?"

### Part A: Delivery Performance

```
Supplier    | Orders | On-Time | Avg Delay | Rejected | Score
------------|--------|---------|-----------|----------|-------
ABC Traders | 250    | 96%     | 1.2 days  | 3        | 94/100
XYZ Corp    | 180    | 88%     | 3.5 days  | 12       | 81/100
Quick Supply| 120    | 92%     | 2.1 days  | 5        | 87/100

Best: ABC Traders
Worst: XYZ Corp (delays + rejections)

Action: [Continue] [Negotiate] [Switch]
```

### Part B: Price Trends

```
Supplier ABC - Rice Price

January   ₹72
February  ₹75
March     ₹79
April     ₹82

Trend: +13% in 4 months
Action: Buy now or negotiate long-term contract
```

### Part C: Product Quality

```
Rejected Goods:

ABC Traders  3 rejections (1.2%)
XYZ Corp     12 rejections (6.7%)
Quick Supply 5 rejections (4.2%)

ABC: Highest quality
XYZ: Quality issues (reason to switch)
```

**What Owner Knows:**
- Who is reliable (ABC)
- Who is problematic (XYZ)
- Price trends (buy now or wait?)
- Quality differences
- Who to negotiate with, who to drop

**APIs:**
```
GET /reports/supplier-performance
GET /reports/supplier-price-trends
GET /reports/supplier-quality
```

---

## Module 5: Branch Intelligence ⭐⭐⭐⭐⭐⭐

**Question:** "How are my branches performing against each other?"

**Only if multi-location. Skip if single warehouse.**

### Scorecard

```
Branch A

Revenue      ₹15,00,000
Profit       ₹3,50,000
Profit %     23%
Inventory    ₹9,00,000
Inventory Accuracy 98%
Approval Time 2 min
Staff         12 people

Branch B

Revenue      ₹8,50,000
Profit       ₹1,80,000
Profit %     21%
Inventory    ₹6,00,000
Inventory Accuracy 96%
Approval Time 4 min
Staff         8 people
```

### Comparison

```
Best Branch: A (higher revenue, higher profit %, better accuracy)
Worst Branch: B (lower metrics across board)

Why is B underperforming?
- Lower inventory = fewer sales
- Slower approvals = more delays
- Accuracy issues = shrinkage
```

### Ranking

```
By Revenue:      A > B > C
By Profitability: A > B > C
By Efficiency:   A > B > C
By Accuracy:     A > B > C
```

**What Owner Knows:**
- Which branch to emulate
- Where problems are
- Why branches differ
- What to fix

**APIs:**
```
GET /reports/branch-comparison
GET /reports/branch/:id/scorecard
```

---

## Module 6: Audit Intelligence ⭐⭐⭐⭐⭐⭐⭐

**Question:** "What's actually happening in my business? Any security issues?"

### Part A: User Activity Ranking

```
Most Active Users

Sam         452 actions
John        390 actions
Alice       340 actions

Slowest Users

Bob         45 actions
Carol       38 actions

Top Approver

John        180 approvals in 2 min avg
Sam         165 approvals in 4 min avg
```

### Part B: Security Report

```
Failed Logins Today       2
New Devices Today         0
Unusual Access Times      0
Suspicious Activities     0
Audit Exports Today       1

Status: All Clear ✓
```

Click "Failed Logins":
```
User: unknown@example.com
Time: 10:30 AM
IP: 203.45.x.x
Action: [Investigate] [Block]
```

### Part C: Most Changed Products

```
Product    | Price | Category | GST | Stock | Changes
-----------|-------|----------|-----|-------|----------
Rice       | 8     | -        | -   | 3     | 11
Oil        | 4     | -        | 2   | -     | 6
Sugar      | 2     | 1        | -   | 2     | 5

Rice changed 11 times in last 30 days
Why? [View history]
```

### Part D: Approval Bottlenecks

```
GR Process: Manager → Finance → CEO
Avg Time at Manager: 2 min
Avg Time at Finance: 8 min  ← Bottleneck
Avg Time at CEO: 1 min

Fix: Give Finance more authority or more staff
```

**What Owner Knows:**
- Who's active, who's slow
- Any security issues (logins, devices, suspicious activity)
- What's being changed and why
- Where approval process bottlenecks

**APIs:**
```
GET /reports/audit-summary
GET /reports/user-activity
GET /reports/security-report
GET /reports/approval-bottlenecks
```

---

## Module 7: Forecasting ⭐⭐⭐⭐⭐⭐⭐

**Question:** "What will happen in the next 30 days?"

### Part A: Demand Forecast

```
Rice

Historical Average: 25/day
Trend: +2% per week
Next Month Demand: 820 units
Confidence: 91%

Current Stock: 120
Expected Stockout: June 25
Recommended Order: 300 units by June 20
```

### Part B: Stockout Prediction

```
Products likely to run out:

Rice           June 25       87% probability
Sugar          July 10       82% probability
Oil            July 15       76% probability
Spices         July 30       65% probability

Revenue at Risk: ₹4,50,000

Action: [Reorder now] [Negotiate lead time] [Discount to sell]
```

### Part C: Revenue Forecast

```
Last Month Actual     ₹10,00,000
This Month Expected   ₹10,80,000
Next Month Expected   ₹11,50,000

Best Case (if Rice supplier accelerates): ₹12,00,000
Worst Case (if Branch B declines): ₹10,20,000

Growth Rate: +8% per month (trending)
```

**What Owner Knows:**
- When things will run out
- Revenue trajectory
- Risk scenarios
- Time to act

**APIs:**
```
GET /reports/demand-forecast
GET /reports/stockout-prediction
GET /reports/revenue-forecast
```

---

## Phase 3 Success Criteria

**The owner says one of these:**

1. ✅ "I can see everything I need on the first screen"
2. ✅ "I don't need anyone to tell me what's happening"
3. ✅ "I can make decisions faster now"
4. ✅ "I can run my company from this dashboard"
5. ✅ "I don't need spreadsheets anymore"

**If 4 out of 5 are true, Phase 3 is successful.**

---

## Implementation Timeline

| Week | Module | Mobile | Web |
|------|--------|--------|-----|
| 1-2 | Executive Dashboard | ✓ | ✓ |
| 2-3 | Inventory Intelligence | ✓ | ✓ |
| 3-4 | Profit Intelligence | - | ✓ |
| 4-5 | Supplier Intelligence | - | ✓ |
| 5-6 | Branch Intelligence | - | ✓ |
| 5-6 | Audit Intelligence | - | ✓ |
| 6-7 | Forecasting | ✓ | ✓ |
| 7-8 | Polish, test, optimize | ✓ | ✓ |

**Total: 8 weeks (3 weeks buffer = 5-6 month timeline)**

---

## Key Principle

Each module should answer ONE clear question.
Each module should be COMPLETE in itself.
Each module should be ACTIONABLE (lead to a decision).

Not pretty dashboards.  
Not vanity metrics.  
Not feature bloat.

**Decision-making tools.**

---

## What This Is NOT

This is NOT:
- AI (Phase 5)
- Workflow builder (Phase 4)
- Mobile offline (Phase 4)
- Multi-company SaaS (Phase 4)
- Barcode scanning (Phase 4)

This IS:
- The 7 modules that answer core business questions
- The dashboard that makes owner say "I can run from here"
- The foundation for Phase 4 features
- The proof that Phase 3 works

---

## Success = Owner Behavior Change

**Before Phase 3:**
Owner checks spreadsheets, emails, calls staff, makes decisions slowly.

**After Phase 3:**
Owner opens ERP dashboard, understands business in 2 minutes, makes decisions.

That behavior change is what you're building for.

Not features.  
Behavior change.

