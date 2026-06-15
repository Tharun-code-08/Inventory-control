# Phase 3: Constitution

**The core principles. Not the roadmap. Not the architecture. The why.**

---

## Mission

Build a system that becomes the owner's second brain.

The ERP should evolve through:

```
Data → Insights → Decisions → Actions → Automation
```

The owner should eventually ask:

```
"What's happening?"
     ↓
"What should I do?"
     ↓
"Do it for me."
```

Without changing the API contract.

---

## Month 1 Goal

Create a dashboard that owners open every morning.

### Success is NOT

- Number of reports
- Number of cards
- Number of charts
- Number of features

### Success is

The owner opens the dashboard every morning without prompting.

Because they can't run their company without it.

---

## The 30-Second Rule

Every card must answer:

> "After seeing this, what should the owner do next?"

If there is no action:

**Remove the card.**

---

## The Core Dashboard

### Card 1: Financial Health

**Answer:** "Am I making money?"

**Must include:**
- Revenue Today
- Revenue This Month
- Net Profit
- Receivables
- Payables

**Must provide:** Action or insight.

Example:
```
Revenue Today: ₹2.34L ↑ 8%
Net Profit This Month: ₹4.3L ↑ 12%

Top product: Rice (inventory cost rising)
→ Review pricing
```

---

### Card 2: Inventory Health

**Answer:** "Is my money stuck?"

**Must include:**
- Low Stock Count
- Dead Stock Value
- Inventory Coverage (days)
- Total Inventory Value

**Must provide:** Urgency + Action.

Example:
```
Low Stock: 3 items
Dead Stock: ₹1.2L

Rice runs out in: 2 days
→ Reorder now
```

---

### Card 3: Attention Center

**Answer:** "What is broken today?"

**Must include:**
- Overdue Payments
- Low Stock Alerts
- Pending Approvals

**Must provide:** Immediate actions.

Example:
```
🔴 Overdue: 2 payments
🟠 Stockout: 1 item tomorrow
🟡 Approvals: 3 pending

[Resolve Now]
```

**Note:** This card may become the most important.

---

### Card 4: Recommendations

**Month 1:** Return empty list.

```
Recommendations

Coming soon...
```

**Why:** Never fake intelligence.

Only show recommendations when they are:
- Explainable
- Trusted
- Actionable

Better to be empty and honest than fake and wrong.

**Month 5 onwards:**

```
Recommendations

1. Reorder Rice
   Reason: Demand ↑ 18%
   Expected shortage: 3 days
   Potential loss: ₹45,000
   [Order Now]
```

---

## After Deployment: Three Questions

Ask every owner:

### Question 1: "What did you look at first?"

→ Learn priority.

### Question 2: "What confused you?"

→ Learn what to simplify.

### Question 3: "If this disappeared tomorrow, what would you miss?"

→ Learn what matters for Month 2.

---

## Three Protections (Non-Negotiable)

### Protection 1: Simplicity

**Rule:** If it doesn't help the owner make a decision in 30 seconds:

**Do not build it.**

Examples of "No":
- AI chatbot
- Fancy animations
- 50 dashboard cards
- Complex filters

Examples of "Yes":
- Low stock alert
- Dead stock visibility
- Overdue payments
- Action buttons

---

### Protection 2: Performance

**Target:** Dashboard loads in < 2 seconds

**Rule:** If slower:

Remove features before adding hardware.

Measurement:
- API response: < 300ms
- Page render: < 1 sec
- Total load: < 2 sec

Performance is the product.

---

### Protection 3: Trust

**Rule:** Every recommendation must answer:

1. What happened?
2. Why?
3. What should I do?
4. What happens if I ignore it?

Example:
```
WHAT:
Rice stock: 32 bags
Daily sales: 12 bags
Days left: 2.6

WHY:
Lead time 3 days
Stock below safe level

WHAT TO DO:
Order 150 bags from ABC Traders

WHAT IF IGNORED:
Stockout June 25
Lost sales: ₹18,000
Emergency cost: ₹6,000
```

Trust compounds.

Once lost, it is expensive to recover.

---

## Forbidden During Phase 3

Do NOT build:

❌ AI chatbot  
❌ Workflow builder  
❌ Offline mode  
❌ CRM module  
❌ HRMS module  
❌ Drag-and-drop report builder  
❌ Complex chart libraries  
❌ SaaS billing  
❌ Multi-tenant architecture  

Why?

Focus wins.

Simplicity wins.

Real businesses care about running their company, not exploring features.

---

## The API Contract

Month 1:
```typescript
{
  financial: { revenueToday, revenueMonth, grossProfit, netProfit, receivables, payables },
  inventory: { totalValue, lowStockCount, deadStockValue, stockCoverageDays },
  attention: [{ type, count, severity, action }],
  recommendations: []
}
```

Month 5:
```typescript
{
  financial: { ... },
  inventory: { ... },
  attention: [...],
  recommendations: [
    { action, reason, expectedProfit, confidence }
  ]
}
```

Phase 5:
```typescript
{
  financial: { ... },
  inventory: { ... },
  attention: [...],
  recommendations: [
    { 
      action, 
      reason, 
      confidence, 
      alternativeActions,
      expectedOutcome
    }
  ]
}
```

**Frontend never changes.**

**Backend gets smarter.**

---

## What Success Looks Like

### NOT

- "We shipped 7 modules"
- "Dashboard is complete"
- "All features implemented"

### YES

Owner says:

> "I open this ERP every morning before I talk to anyone."

Because they know:
- Financial health in 5 seconds
- Inventory status in 10 seconds
- Problems to fix in 10 seconds
- What to do next in 0 seconds (already shown)

---

## The Experiment

You have already proven:

✅ Core ERP  
✅ Audit architecture  
✅ Operational maturity  
✅ CI, backups, health checks  
✅ Real VPS deployment  
✅ Clear product direction  

The next lesson won't come from another document.

It will come from a business owner opening your dashboard on **Tuesday morning** and deciding whether to open it again on **Wednesday**.

That's the experiment now.

---

## The Only Remaining Question

Can you build something people miss when it's gone?

That's what Month 1 will answer.

Build it.

Ship it.

Watch carefully.

Then let reality teach you what Month 2 should become.

