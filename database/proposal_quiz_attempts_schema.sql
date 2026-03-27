-- Run this in your Supabase SQL editor
CREATE TABLE IF NOT EXISTS proposal_quiz_attempts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id     TEXT        NOT NULL,
  project_id        TEXT        NOT NULL,
  score             INTEGER     NOT NULL,
  passed            BOOLEAN     NOT NULL DEFAULT FALSE,
  badge_unblock_used BOOLEAN    NOT NULL DEFAULT FALSE,
  attempted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_quiz_attempts_lookup
  ON proposal_quiz_attempts(freelancer_id, project_id, attempted_at);
