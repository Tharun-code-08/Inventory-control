# Month 1 Week 4: Validation Checklist

**Before Month 1 is "ready", verify these 8 things with real owners**

---

## 1. Performance Metrics

### Backend Targets
```
GET /dashboard

P50  < 150 ms
P95  < 300 ms
P99  < 500 ms
```

### Frontend Targets
```
Dashboard visible on screen

WiFi       < 1 sec
4G         < 2 sec
Worst case < 3 sec
```

### Verification
- [ ] Monitor first 30 API calls in production
- [ ] If one card exceeds budget, remove complexity
- [ ] Log response times to analytics
- [ ] Alert if P95 > 300ms

### If Slow
```
Option 1: Simplify the slow card
  Remove fields
  Reduce calculations
  Cache aggressively

Option 2: Don't show it
  Defer to Month 2
  Better to ship fast than complete
```

---

## 2. Single API Call

### DO:
```
GET /dashboard/executive
{
  financial: {...},
  inventory: {...},
  attention: [...],
  recommendations: []
}
```

### DON'T:
```
GET /dashboard/financial
GET /dashboard/inventory
GET /dashboard/attention
GET /dashboard/recommendations
```

### Why
Owners don't care about microservices.
They care: App opens. Fast.

### Verification
- [ ] Only 1 API call to load dashboard
- [ ] Network tab shows single request
- [ ] No waterfall of requests

---

## 3. Financial Card: Actionable

### Wrong
```
Revenue: ₹23L
Profit: ₹5L
```

Owner reads and thinks: "So what?"

### Right
```
Revenue Today

₹2.34L
↑ 8%

Net Profit This Month

₹4.3L
↑ 12%

⚠️ Action

Rice margins falling 3%

→ Review pricing
```

Owner reads and thinks: "I need to check rice pricing."

### Verification
- [ ] Each number has context (trend, comparison)
- [ ] Each number has suggested action
- [ ] Owner can make decision without clicking

---

## 4. Attention Card: Addictive

### The Goal
Owner thinks: "Let me clear today's problems."

### Design
```
Attention (3 items)

🔴 2 overdue payments
   Due > 15 days

🟠 Rice stock runs out tomorrow
   Reorder today

🟡 3 approvals pending
   Average age: 6 hours

[Resolve Now →]
```

### Why This Works
- Color codes urgency (red = fire, yellow = waiting)
- Specific numbers (not "some")
- Clear action ("Resolve Now")
- Creates habit (owner checks every morning)

### Verification
- [ ] Owner opens Attention card first
- [ ] Owner takes action within 2 minutes
- [ ] Owner visits every morning (after 1 week)

---

## 5. Instrument Everything

### Events to Track
```
dashboard_opened
  → Every time dashboard visible

card_clicked
  → Which card? (financial/inventory/attention/recommendations)

card_viewed_seconds
  → How long on each card?

attention_resolved
  → Owner tapped [Resolve Now]

recommendation_accepted
  → Owner tapped [Accept]

recommendation_rejected
  → Owner tapped [Decline]

refresh_clicked
  → Owner pulled to refresh

error_occurred
  → Error type and recovery time
```

### After 30 Days, You Should Know
```
Most opened card?
Least opened card?
Average session duration?
Daily active owners? (target > 80%)
Actions per session? (target > 1)
Recommendation acceptance rate? (baseline for Month 5)
```

### Verification
- [ ] All 8 events logged to audit trail
- [ ] Dashboard in Audit module shows user behavior
- [ ] Can answer all 6 questions above

---

## 6. "Last Updated" Timestamp

### Add to Dashboard
```
Financial Health

Last updated: 09:32 AM ↻

Revenue Today: ₹2.34L
...
```

### Why
Owner thinks: "Is this live data or stale?"

Trust = "This is real."
Doubt = "When was this updated?"

### Verification
- [ ] Timestamp visible on dashboard
- [ ] Timestamp updates on refresh
- [ ] Owner doesn't ask "Is this current?"

---

## 7. Recommendations Card: Humble

### Month 1: Be Honest
```
Recommendations

Coming soon.

We're analyzing your business patterns.
Check back in Month 5.
```

### Never Do This
```
Recommendations

🚀 NEW: AI-powered insights!

Increase rice price 8%
Expected profit: +₹42K
Confidence: 94%
```

Without months of data, you're guessing.
Bad recommendations destroy trust.

### When Fake Intelligence Happens
Owner thinks: "The system doesn't understand my business."
Owner stops trusting.
Owner stops opening dashboard.

### Verification
- [ ] Month 1: Recommendations card is honest
- [ ] Card says "Coming soon"
- [ ] No fake intelligence
- [ ] Owner trusts the system

---

## 8. The Week 4 Interview

### Setup
Sit beside owner.
Watch them use dashboard.
Don't explain features.
Let them figure it out.

### Question 1: Priority
> What did you look at first?

Listen for:
- Financial? → Owner worried about money
- Attention? → Owner worried about daily issues
- Inventory? → Owner worried about stock

This tells you what matters to them.

### Question 2: Clarity
> What confused you?

Listen for:
- Unclear terms
- Missing context
- Numbers that don't make sense
- Actions that aren't obvious

Fix before Month 2.

### Question 3: Core
> If I remove one card tomorrow, which would upset you the most?

Listen for:
- Which card they can't live without?
- Which card changed how they think?
- Which card they actually use?

That card is your MVP.
The others are nice-to-have.

### After 3 Interviews
You'll know:
- What owners actually care about
- What's confusing
- What's essential
- What Month 2 should build

This information is worth more than months of planning.

---

## Checklist: Month 1 Ready

- [ ] **Performance**: P95 < 300ms backend, < 2s frontend
- [ ] **Single Call**: Only GET /dashboard/executive
- [ ] **Financial**: Actionable (numbers + trend + action)
- [ ] **Attention**: Addictive (color-coded, urgent, habit-forming)
- [ ] **Instrumentation**: 8 events tracked, 6 questions answerable
- [ ] **Timestamp**: "Last updated" visible on dashboard
- [ ] **Humble**: Recommendations = "Coming soon"
- [ ] **Validated**: 3 owner interviews completed

---

## The Real Milestone

Not: "Month 1 shipped"

But: **"Owner opens dashboard every morning without prompting"**

When that happens:
- You're no longer building an interface
- You're building a daily operating system
- You've earned the owner's trust
- You've earned daily engagement

That's when you can expand to Month 2-7.

Everything else is secondary.

