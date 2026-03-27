-- ============================================================
-- Questions table for level-wise skill assessments
-- Each skill has Bronze / Silver / Gold questions
-- Test cases are stored server-side only (never sent to client)
-- ============================================================

CREATE TABLE IF NOT EXISTS questions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  skill         TEXT        NOT NULL,
  level         TEXT        NOT NULL CHECK (level IN ('Bronze', 'Silver', 'Gold')),
  language_id   INTEGER     NOT NULL,
  title         TEXT        NOT NULL,
  description   TEXT        NOT NULL,
  input_format  TEXT,
  output_format TEXT,
  example       JSONB,
  test_cases    JSONB       NOT NULL,   -- array of { stdin, expectedOutput } — NEVER sent to client
  is_active     BOOLEAN     DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_skill_level ON questions (skill, level);
CREATE INDEX IF NOT EXISTS idx_questions_active      ON questions (is_active);
