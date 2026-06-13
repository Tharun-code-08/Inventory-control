# Phase 3 Week 4: Reality Report Template

**What the product actually needs to be, based on what owners actually do.**

---

## Owner A

**Company:** [Name]  
**Business Type:** [retail/distribution/services/manufacturing]  
**Interview Date:** [date]  

### Behavior

**First card clicked:**
```
[financial / inventory / attention / recommendations]
```

**Ignored cards:**
```
[list cards owner never opened]
```

**Confused by:**
```
[specific UI element or metric]
```

**Would miss if removed:**
```
[most valuable card]
```

### Session Metrics
```
Days active per week:     [X days]
Avg session duration:     [X seconds]
Total sessions:           [X]
Actions per session:      [X]
Most-used card:          [X]
```

### Owner's Words
```
"What did you look at first?"
→ [Owner's answer]

"What confused you?"
→ [Owner's answer]

"If I removed one card, which would upset you?"
→ [Owner's answer]
```

### Notes
```
[Qualitative observations]
[Patterns observed]
[Questions owner asked]
[Actions owner took]
```

---

## Owner B

[Same format]

---

## Owner C

[Same format]

---

## Pattern Analysis

### Card Usage Consensus

**Attention Card:**
- Owner A: [First click / Ignored / Used frequently]
- Owner B: [First click / Ignored / Used frequently]
- Owner C: [First click / Ignored / Used frequently]

**Pattern:** [Most / Some / None] owners prioritize Attention

---

### Confusing Elements

**Inventory Coverage:**
- Owner A: Confused
- Owner B: Clear
- Owner C: Confused

**Pattern:** [1 = anecdote / 2 = possible issue / 3 = redesign needed]

---

### Missing Features

**Common requests:**
```
Owner A asked: "..."
Owner B asked: "..."
Owner C asked: "..."
```

**Anecdote or pattern?** [Assess based on agreement]

---

## 9 AM Ritual Analysis

**Question:** Is this becoming a Morning Operating System or an Emergency Dashboard?

The system can answer this — `dashboard_opened` is a timestamped event.
Slice it by hour-of-day, not by daily count.

### Evidence from Instrumentation
```
Opens by hour of day:       [histogram — when do opens cluster?]
First open time per owner:  Owner A [HH:MM], B [HH:MM], C [HH:MM]
Consecutive days opened:    Owner A [X], B [X], C [X]
Opens before 10 AM (%):     [X%]
Opens only after alerts (%):[X%]
```

### Interpretation

| Pattern | Meaning |
|---------|---------|
| Opens clustered 8:45–9:15 AM | Morning ritual forming |
| Opens mostly after alerts | Emergency tool |
| Opens randomly | No habit yet |
| Opens daily before WhatsApp/email | Becoming operating system |

### Decision
```
Ritual forming   → Continue to Month 2
Emergency only   → Improve Attention card
No pattern       → Simplify Month 1
```

---

## Habit Replacement

**Question:** What old behavior disappeared?

Software usage = adoption.
Old habits disappearing = product-market fit.

This is the higher bar. No event can capture it — only the interview.

### Ask the Owner
```
1. Before this dashboard, what did you do every morning?
2. What did you NOT do this week because of the dashboard?
3. What became faster?
4. What became unnecessary?
5. If this disappeared tomorrow, what would hurt most?
```

### Record the Answers

**Owner A:**
```
Stopped doing:    [e.g., "calling my store manager"]
Became faster:    [e.g., "following up overdue payments"]
Became unnecessary:[e.g., "opening Excel for stock"]
Would hurt most:  [e.g., "wouldn't know what to do in the morning"]
```

**Owner B:** [same]

**Owner C:** [same]

### Interpretation
```
0 owners report a replacement → adoption only, no fit yet
1 owner reports a replacement → anecdote, watch it
2-3 owners report the SAME replacement → product-market fit forming
```

The dashboard isn't being *used*. It's *replacing* something.
That's when software becomes infrastructure.

---

## Key Findings

### The Product

**Most valuable card:** [Card name - all owners wanted this]

**Noise card:** [Card name - owners ignored it]

**Real question owners need answered:** [What they repeatedly asked about]

---

### The Behavior

**Daily habit formed?**
```
Owner A: [Yes / No / Partial]
Owner B: [Yes / No / Partial]
Owner C: [Yes / No / Partial]
```

**Average session duration:**
```
[X seconds - is this too long? Too short?]
```

**Actions taken per session:**
```
[X - are owners making decisions?]
```

---

## Month 2 Implications

### If All Owners Ignore Financial
```
❌ Don't fix Financial in Month 2
✅ Accept that owners care less about raw numbers
✅ Instead, double down on Attention
✅ Build Month 2 around what owners actually do
```

### If All Owners Ask "What should I do?"
```
❌ Don't build a chart
✅ Build decision intelligence
✅ That becomes Month 2 core
✅ Recommendations card becomes critical
```

### If No Owner Opens Dashboard Twice
```
❌ Don't launch Month 2
✅ Something fundamental is wrong
✅ Redesign Month 1 completely
✅ Retest before expanding
```

---

## Guard Rails Applied

### Sample Size Reality

```
1 owner says "Add pie chart"
→ Anecdote. Ignore.

All 3 owners ignore Financial card
→ Pattern. Redesign.

All 3 owners ask "What should I do?"
→ Signal. Build Month 2 around this.
```

---

## The Question Week 4 Answers

Not:
```
"What features should I build?"
```

But:
```
"What problem do owners actually have?"
```

---

## Success Criteria

✅ **All 3 owners return on Day 2 without being asked**
→ Month 1 created habit

⚠️ **2 of 3 owners return without being asked**
→ Something works, but not universally

❌ **0-1 owners return without being asked**
→ Month 1 failed. Redesign before Month 2.

---

## After This Report

**Month 2 is not predetermined.**

Month 2 is determined by:
- What owners actually did
- What they actually asked
- What they would actually miss

If the Reality Report shows owners care about Attention + Financial, but ignore Inventory:
- Don't build Inventory Intelligence in Month 2
- Build Attention Intelligence or Financial Intelligence instead
- Let behavior guide the roadmap

**That is how you build a product people use.**

---

## Morning Ritual Score (Internal Only)

Compute per owner after Week 4. Do not expose to users — this is for you.

```
Morning Ritual Score
  = (% opens before 10 AM)
  × (consecutive active days)
  × (actions taken per session)
```

### Example
```
Owner A → opens 9:02 AM daily, 9 consecutive days, 2 actions/session
          0.95 × 9 × 2 = 17.1  → routine

Owner B → opens once every 3 days, after a problem, 1 action
          0.20 × 1 × 1 = 0.2   → emergency tool
```

### Why It Matters

You are not optimizing for **usage**.
You are optimizing for **becoming part of someone's routine**.

A high score means the dashboard runs before the owner talks to anyone.
That is the moment an ERP stops being software and becomes infrastructure.

Track this number across owners and over time. It is the single internal
metric that best predicts whether the moat is forming.

