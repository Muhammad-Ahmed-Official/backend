-- ============================================================
-- Badges System Schema Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. Create badges table ────────────────────────────────────

CREATE TABLE IF NOT EXISTS badges (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill             VARCHAR(100) NOT NULL,
  badge_level       VARCHAR(20) NOT NULL CHECK (badge_level IN ('Gold', 'Silver', 'Bronze')),
  badge_points      INT         NOT NULL DEFAULT 10,  -- Gold=30, Silver=20, Bronze=10
  provider          VARCHAR(100) NOT NULL,            -- e.g. 'Judge0', 'Coursera', 'Portfolio', 'Admin'
  verification_type VARCHAR(30) NOT NULL CHECK (verification_type IN ('coding_test', 'certificate', 'portfolio')),
  score             INT,                              -- test score (only for coding_test type)
  certificate_url   TEXT,                             -- certificate link (only for certificate type)
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN (
                        'pending',   -- certificate submitted, waiting for admin approval
                        'active',    -- badge is live on profile
                        'rejected',  -- admin rejected the certificate
                        'revoked',   -- admin manually revoked
                        'expired'    -- past expires_at date
                      )),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  expires_at        TIMESTAMPTZ,                      -- optional: badge expiry date
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Indexes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_badges_user_id           ON badges(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_skill             ON badges(skill);
CREATE INDEX IF NOT EXISTS idx_badges_level             ON badges(badge_level);
CREATE INDEX IF NOT EXISTS idx_badges_status            ON badges(status);
CREATE INDEX IF NOT EXISTS idx_badges_verification_type ON badges(verification_type);

-- ── 3. Prevent duplicate active badges for same user + skill ──
--    A freelancer can only have ONE active badge per skill.
--    They can retake tests (old badge becomes 'revoked' first).

CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_unique_active_skill
  ON badges(user_id, skill)
  WHERE status = 'active';

-- ── 4. Helper function: get_freelancer_badge_score ────────────
--    Returns the total badge points for a given user.
--    Used for ranking freelancers by badge score.

CREATE OR REPLACE FUNCTION get_freelancer_badge_score(p_user_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(badge_points), 0)::INT
  FROM   badges
  WHERE  user_id = p_user_id
  AND    status  = 'active';
$$;

-- ── 5. Score → Badge Level reference ─────────────────────────
--    This is enforced in the backend controller, documented here.
--
--    Score Range  │ Badge Level │ Points
--    ─────────────┼─────────────┼───────
--    90 – 100     │ Gold        │ 30
--    70 – 89      │ Silver      │ 20
--    50 – 69      │ Bronze      │ 10
--    Below 50     │ No badge    │ —
--
-- ── 6. Verification Type reference ───────────────────────────
--
--    Freelancer Type       │ verification_type │ How it works
--    ──────────────────────┼───────────────────┼──────────────────────────────
--    Developers            │ coding_test       │ Judge0 API → auto score
--    Designers / Marketers │ certificate       │ Paste URL → admin approves
--    Creative / Portfolio  │ portfolio         │ Admin assigns manually
