-- Week 4: Owner Feedback Tracking
-- Purpose: Preserve qualitative feedback from real owners
-- This table will explain why the product became what it became

CREATE TABLE IF NOT EXISTS "OwnerFeedback" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES "companies"(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,

  -- Interview date
  feedback_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Question 1: What did you look at first?
  looked_at_first VARCHAR(50),
    -- Values: 'financial', 'inventory', 'attention', 'recommendations'

  -- Question 2: What was ignored?
  ignored_cards TEXT[],
    -- Array of card names that owner didn't use

  -- Question 3: What was confusing?
  confused_by TEXT,
    -- Free text: what didn't make sense to owner

  -- Question 4: Most valuable?
  most_valuable_card VARCHAR(50),
    -- Which card owner valued most

  -- Missing?
  missing_feature TEXT,
    -- What feature was owner looking for

  -- Would miss if removed?
  would_miss_if_removed VARCHAR(50),
    -- Which card is essential

  -- Qualitative notes
  notes TEXT,

  -- Session metrics (recorded separately, can reference here)
  avg_session_duration_seconds INTEGER,
  days_active_per_week INTEGER,
  total_sessions INTEGER,
  actions_per_session DECIMAL(3,2),

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookup by company and date
CREATE INDEX IF NOT EXISTS idx_owner_feedback_company_date
  ON "OwnerFeedback"(company_id, feedback_date DESC);

-- Index for tracking owner-specific feedback over time
CREATE INDEX IF NOT EXISTS idx_owner_feedback_owner
  ON "OwnerFeedback"(owner_id, feedback_date DESC);
