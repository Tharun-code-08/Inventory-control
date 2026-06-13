# Phase 3: Three Permanent Execution Rules

**These rules prevent scope creep and maintain focus on what matters.**

Apply them to every feature built in Months 1-7 and beyond.

---

## Rule 1: Every Card Must Answer "What Should The Owner Do?"

### Bad ❌

```
Revenue Today

₹2,34,000
```

Owner reads this and asks: "So what?"

### Good ✅

```
Revenue Today

₹2,34,000

↓ 8% compared to yesterday

Top reason:
Branch Salem underperforming

Action:
Review Branch Salem sales
[Tap to drill down]
```

Owner reads this and knows: "I need to check Salem branch today."

---

## The Pattern

**Data → Context → Action**

Every card must follow this:

1. **What happened?** (the number)
2. **Why does it matter?** (context + comparison)
3. **What should I do?** (action)

### More Examples

**Bad:**
```
Low Stock Items

12
```

**Good:**
```
Low Stock Items

12 items

3 CRITICAL (will stockout in 2 days)
- Rice (2 days left)
- Oil (1 day left)  
- Sugar (3 days left)

Action:
Reorder critical items now
[Create PO]
```

**Bad:**
```
Pending Approvals

8
```

**Good:**
```
Pending Approvals

8 items

Age:
- 2+ days: 3 items (URGENT)
- 1-2 days: 2 items
- < 1 day: 3 items

Most urgent:
GR-4521 (3 days old)

Action:
[Approve] [Reject] [Escalate]
```

---

## Rule 2: Every Insight Must Be Explainable

### The "Why?" Button

When Month 7 dashboard shows:

```
Recommendation:

Increase Rice price by 3%
```

Owner should be able to press **[Why?]** and see:

```
Reasoning:

Demand ↑ 12% (last 30 days)
Competitor price ↑ 5% (this month)
Inventory healthy (65 days stock)

Expected Impact:

Profit: +₹42,000/month
Risk: Low (competitors higher)

Confidence:

94%

Assumption:
No volume loss (elasticity = 0.6)
```

### Why This Matters

**AI recommendations without explanations destroy trust.**

Owner doesn't say "yes" to a recommendation because an algorithm says so.

Owner says "yes" because they understand the reasoning and agree with it.

### Every Recommendation Type

**Month 5 (Reorder):**
```
Recommendation: Order 200 units Rice

Why?
- Current stock: 120 units
- Average demand: 25/day
- Days left: 4.8 days
- Lead time: 3 days
- Status: Will stockout in 1.8 days

Suggested supplier: ABC Traders
- On-time: 96%
- Price: ₹82/unit (best)
- Confidence: 92%
```

**Month 7 (Forecast):**
```
Recommendation: Prepare for stockout on June 25

Why?
- Rice demand forecast: +12% next month
- Current safety stock: 50 units
- Lead time: 3 days
- Reorder point: 75 units
- Reorder due: June 22

Action impact:
- Prevent lost sales: ₹2.1L
- Confidence: 88%
```

**Phase 5 (Autonomous):**
```
System Decision: Create PO for 250 Rice units

Reasoning:
- Demand trending +12% (last 30 days)
- Supplier ABC available (96% on-time)
- Price: ₹79/unit (good deal, expires tomorrow)
- Expected stockout: June 25
- Lead time: 3 days

Owner decision point:
- [Approve] Creates PO immediately
- [Edit] Change quantity, supplier
- [Reject] System will alert again

Expected impact: Prevent ₹2.1L lost sales
```

### The "Explain Your Work" Principle

In school: "Show your work"

In Phase 3: "Explain your reasoning"

Every recommendation must include:
- What data was used
- What assumptions were made
- What could go wrong
- What confidence level you have
- What would change your mind

---

## Rule 3: Every Feature Becomes An Audit Event

### Current Audit Events

You already built these:

```
LOGIN
CREATE_PRODUCT
UPDATE_PRODUCT
RECEIVE_GOODS
APPROVE
REJECT
ESCALATE
EXPORT_AUDIT
```

### Continue This Forever

**Month 1:**
```
VIEW_DASHBOARD
VIEW_FINANCIAL_CARD
VIEW_INVENTORY_CARD
DRILL_TO_LOW_STOCK
```

**Month 2:**
```
VIEW_INVENTORY_AGING
VIEW_REORDER_INTELLIGENCE
CREATE_PO_FROM_RECOMMENDATION
```

**Month 3:**
```
VIEW_PROFIT_REPORT
ANALYZE_PRODUCT_PROFITABILITY
VIEW_MARGIN_ANALYSIS
```

**Month 5:**
```
VIEW_AUDIT_REPORT
VIEW_USER_RISK_SCORE
REVIEW_ANOMALY_ALERT
```

**Month 7:**
```
RUN_FORECAST
VIEW_DEMAND_FORECAST
ACCEPT_RECOMMENDATION
REJECT_RECOMMENDATION
SIMULATE_SCENARIO
```

**Phase 5:**
```
AI_RECOMMENDATION_GENERATED
AI_RECOMMENDATION_ACCEPTED
AI_RECOMMENDATION_REJECTED
AUTONOMOUS_ACTION_EXECUTED
AUTONOMOUS_ACTION_ROLLED_BACK
```

### Why This Matters

Years later, you'll know:

```
Which reports do owners actually use?
Which recommendations work?
Which AI suggestions are trusted?
Which features are useless?
Which workflows need improvement?
```

**Your audit system becomes your product analytics system.**

### The Event Structure

Every audit event should include:

```typescript
{
  eventType: "VIEW_PROFIT_REPORT",
  userId: "sam@example.com",
  timestamp: "2026-06-13T09:15:23Z",
  
  // What they did
  action: "opened profit report",
  
  // Context
  context: {
    reportType: "product_profitability",
    timeRange: "30_days",
    category: "rice"
  },
  
  // System state (for analysis)
  systemState: {
    numberOfProducts: 45,
    numberOfAlerts: 3,
    previousDashboardView: 2_minutes_ago
  },
  
  // What happened next (retroactively)
  outcome: {
    timeSpentViewing: 180_seconds,
    actionsToken: ["DRILL_TO_PRODUCT", "COMPARE_COMPETITORS"],
    nextStep: "CREATED_PO"
  }
}
```

### How You'll Use This Later

**Month 9:**
```
Question: Are owners using Profit Intelligence?

Answer: 
- 72% of owners view profit report
- Average time: 3 minutes
- 45% take action within 5 minutes
- Most common action: Create/update PO
```

**Month 12:**
```
Question: Do recommendations work?

Answer:
- AI recommendations accepted 68% of the time
- When accepted, lead to positive outcome 91%
- When rejected, 23% re-accepted within 1 week
- Most trusted: Reorder recommendations
- Least trusted: Price change recommendations
```

**Year 2:**
```
Question: What should we build next?

Answer:
- Users who simulate scenarios grow 40% faster
- Users with audit visibility approve 3x faster
- Users without branch comparison stay in Month 6
- Users with forecasting plan purchases 2x better
```

---

## The Competitive Moat

Most ERPs are:

```
Database

↓

Screens

↓

Forms

↓

Reports
```

**Your ERP becomes:**

```
Database

↓

Events

↓

Insights

↓

Recommendations

↓

Actions

↓

Learning

↓

Smarter Recommendations

↓

(Repeat)
```

That's a **feedback loop**.

The system gets better because people use it.

The more people use it, the smarter it gets.

The smarter it gets, the more people use it.

This is how you build a moat that competitors can't copy.

---

## Rule Application Checklist

Before shipping any feature in Phase 3, ask:

- [ ] Does this card answer "What should I do?"
- [ ] Can the owner understand WHY?
- [ ] Is this action audited?
- [ ] Will this data help us improve next month?
- [ ] Does this help the owner run their business?

If all are YES → Ship it.

If any are NO → Redesign or defer.

---

## The Execution Focus

**Not:** "We shipped 7 features"

**But:** "Owners can't live without this system"

### The Milestone

When 80%+ of owners open the dashboard every morning without prompting...

When they can answer their business question in 30 seconds...

When they take immediate action based on recommendations...

When they say: **"I don't start my day until I open this ERP"**

...that's when you've built something valuable.

Everything else (Months 4-7, Phase 4, Phase 5) becomes easier after that milestone.

---

## Forever

These three rules don't expire after Month 7.

They apply to:
- Every feature in Phase 4
- Every AI recommendation in Phase 5
- Every autonomous action in the future

A feature that doesn't answer "what should I do?" shouldn't exist.

An insight that isn't explainable shouldn't exist.

An action that isn't audited shouldn't exist.

**Keep the system honest.**

