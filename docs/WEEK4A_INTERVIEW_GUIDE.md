# Week 4A Interview Guide: Dashboard Habit Replacement

**Phase 3 Week 4A Reality Validation**  
**Date:** June 13, 2026  
**Focus:** Single owner, 7-14 day observation window

---

## The Gold Signal

**Primary Question:**  
> "What did you stop doing because of this dashboard?"

This single question reveals whether the dashboard has replaced a daily habit. The answer demonstrates product-market fit more honestly than any feature request.

---

## Why This Question

### The Dangerous Trap
- **False positive:** Owner says "I love it!" (enthusiasm is emotionally rewarding, not proof of value)
- **Real signal:** Owner stops doing something they used to do every morning
- **The shift:** From "Does the owner like the product?" to "Has the owner changed their behavior?"

### What You're Looking For
Habits the owner should stop doing if the dashboard works:

1. **Opening Excel/Google Sheets** to check daily revenue, inventory, cash position
2. **Calling employees** to ask "What do we have in stock today?"
3. **Sending WhatsApp messages** asking suppliers "Where's our order?"
4. **Manual checking** of pending approvals or overdue payments via email
5. **Scrolling through PDFs** or printed reports to find urgent items

### Red Flags (Product Not Working)
- Owner still opens Excel every morning
- Owner still needs manual status updates from team
- Owner sees dashboard but still uses WhatsApp to ask questions

---

## Observation Protocol (7-14 Days)

### What to Track
Watch for ONE behavioral row showing:
1. **Consecutive morning opens** (9 out of 10 mornings is the threshold for ritual)
2. **Dashboard opened before 10 AM** (the "morning ritual" window)
3. **Stopped using Excel/WhatsApp** during that same period
4. **Took direct action** from the dashboard (resolved attention item, made decision without calls)

### Telemetry Evidence
The audit log will show:
- `VIEW_DASHBOARD` events with timestamps (captures ritual timing)
- `DASHBOARD_CARD_CLICKED` with `firstClick=true` (shows priority interest)
- `ATTENTION_ITEM_RESOLVED` events (shows owner taking action from dashboard)
- `DASHBOARD_EXIT` with session duration (shows engagement level)
- **Missing:** Excel export events, manual approval requests via email

### The Interview Conversation

**Day 7-10 Check-in:**
> "Hey [Owner], you've been using the dashboard for a week now. What, if anything, have you stopped doing because of it?"

Wait for the answer. Listen for specifics:
- ✅ **"I stopped checking Excel every morning"** → Signal success
- ✅ **"I just text [manager] now instead of calling"** → Efficiency gain (proxy signal)
- ✅ **"I resolved 3 overdue payments directly from the dashboard"** → Direct impact
- ❌ **"I like it!"** → Not yet a habit signal
- ❌ **"I still check emails for approvals"** → Not replacing the workflow
- ❌ **"Haven't really changed anything"** → Product isn't answering the problem

**Follow-up if needed:**
> "Before the dashboard, what was the first thing you'd do every morning to understand what's happening in the business?"

Listen for the old ritual. Does the dashboard replace it?

---

## Success Criteria (Go/No-Go for Month 2)

### ✅ GO: Proceed to 3 Owners
Evidence that the dashboard replaced a morning habit:
- Owner checked dashboard 9+ mornings in a row before 10 AM
- Owner explicitly stated they stopped doing [specific habit]
- Telemetry shows attention items being resolved directly
- No regression: Owner didn't revert to the old tool

### ❌ NO-GO: Iterate on Month 1 (Do Not Expand)
Reasons to hold and not bring in 3 owners:
- Owner still uses Excel/manual tools every morning
- Dashboard shows < 5 opens in 7 days (not a ritual yet)
- Owner likes the dashboard but doesn't use it for decisions
- Load time > 2 seconds (frustration barrier)
- Dashboard missing a critical card/metric the owner needs

---

## What NOT to Ask

❌ "Do you like the dashboard?" → Too generic, preference signal only  
❌ "Is this better than Excel?" → Invites social desirability bias  
❌ "Would you recommend it?" → Too early for NPS-style questions  
❌ "What features should we add?" → Keeps scope creeping, disrupts focus  

---

## Metrics You'll Have (From Telemetry)

After 7-14 days, you'll see audit logs for this owner with:

```
{
  "user": "Owner Name",
  "action": "VIEW_DASHBOARD",
  "createdAt": "2026-06-15T09:30:00Z",  // morning ritual timing
  "metadata": {
    "loadTimeMs": 847,  // performance signal
    "sessionId": "..."
  }
}

{
  "action": "DASHBOARD_CARD_CLICKED",
  "metadata": {
    "card": "attention",  // which card they care about
    "firstClick": true,  // highest priority
    "sessionId": "..."
  }
}

{
  "action": "ATTENTION_ITEM_RESOLVED",
  "metadata": {
    "itemId": "overdue_payments",
    "itemType": "overdue_payments",
    "resolution": "user_action"
  }
}

{
  "action": "DASHBOARD_EXIT",
  "metadata": {
    "durationMs": 120000,  // 2 minutes in app
    "cardsViewed": 3,      // engagement depth
    "actionsTaken": 1,     // took action during session
    "firstCard": "attention"  // priority
  }
}
```

The interview answer + this telemetry tells the story of whether the habit changed.

---

## Next Steps

1. **Identify the owner** (user provides criteria)
2. **Invite them** with a simple ask: "Use the dashboard every morning for a week. See if it changes how you work."
3. **Don't ask them to give feedback** — just observe the telemetry
4. **On Day 7-10:** Ask the one question
5. **Match answer to telemetry** — does the story align?
6. **Decision:** Month 2 goes to 1 owner or needs iteration

---

## Remember

> "Week 4 only happens once. If you forget to ask the question, you can't recover that lost observation later."

Document the answer the same day. The question is so simple that it's easy to skip. Don't.
