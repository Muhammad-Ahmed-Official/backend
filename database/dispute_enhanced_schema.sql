-- Enhanced dispute schema: stage deadlines, mediation recommendation,
-- both-party acceptance, respondent response, subcategory

-- Subcategory for more granular dispute categorization
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Response deadline: how long the respondent has to reply after dispute is filed (72h)
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMPTZ;

-- Stage deadline: when the current stage must be acted on before auto-escalation (7 days)
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS stage_deadline TIMESTAMPTZ;

-- Mediation recommendation issued by admin/mediator
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS mediation_recommendation TEXT;

-- Both-party acceptance of the mediation recommendation
-- NULL = not yet responded, TRUE = accepted, FALSE = rejected
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS client_accepted BOOLEAN DEFAULT NULL;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS freelancer_accepted BOOLEAN DEFAULT NULL;

-- Respondent's initial response: 'accepted' | 'rejected' | 'counter'
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS respondent_response TEXT;

-- Allow dispute_timeline.performed_by to be NULL (for system-generated events)
ALTER TABLE dispute_timeline ALTER COLUMN performed_by DROP NOT NULL;

-- Backfill response_deadline for existing open disputes (72h from now if not set)
UPDATE disputes
SET response_deadline = NOW() + INTERVAL '72 hours'
WHERE response_deadline IS NULL
  AND status NOT IN ('resolved', 'closed', 'denied', 'Resolved', 'Denied', 'Closed');

-- Backfill stage_deadline for existing open disputes (7 days from now if not set)
UPDATE disputes
SET stage_deadline = NOW() + INTERVAL '7 days'
WHERE stage_deadline IS NULL
  AND status NOT IN ('resolved', 'closed', 'denied', 'Resolved', 'Denied', 'Closed');

-- Add indexes for deadline queries (used by auto-escalator)
CREATE INDEX IF NOT EXISTS idx_disputes_stage_deadline ON disputes(stage_deadline)
    WHERE status NOT IN ('resolved', 'closed', 'denied');
CREATE INDEX IF NOT EXISTS idx_disputes_response_deadline ON disputes(response_deadline)
    WHERE status NOT IN ('resolved', 'closed', 'denied');
