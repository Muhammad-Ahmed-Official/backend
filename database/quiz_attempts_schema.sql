-- Run this in your Supabase SQL editor
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        NOT NULL,
  skill       TEXT        NOT NULL,
  level       TEXT        NOT NULL,
  passed      BOOLEAN     NOT NULL DEFAULT FALSE,
  score       INTEGER,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_lookup
  ON quiz_attempts(user_id, skill, level, attempted_at);
