-- ============================================================
-- Phase 2: Escrow System Schema Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. Extend milestones table ────────────────────────────────

ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS amount         NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS submitted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at    TIMESTAMPTZ;

-- Drop old status constraint and add new one with escrow statuses
ALTER TABLE milestones DROP CONSTRAINT IF EXISTS milestones_status_check;
ALTER TABLE milestones ADD CONSTRAINT milestones_status_check
  CHECK (status IN (
    'pending',      -- created, not yet funded
    'funded',       -- client locked money in escrow
    'in_progress',  -- freelancer is working
    'in_review',    -- freelancer submitted, awaiting client review
    'submitted',    -- legacy alias (kept for backward compat)
    'approved',     -- legacy alias (kept for backward compat)
    'released',     -- escrow released to freelancer
    'disputed'      -- dispute opened, funds frozen
  ));

-- ── 2. Create escrow_transactions table ─────────────────────

CREATE TABLE IF NOT EXISTS escrow_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id  UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  payer_id      UUID NOT NULL REFERENCES users(id),
  payee_id      UUID NOT NULL REFERENCES users(id),
  amount        NUMERIC(10,2) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'HELD'
                  CHECK (status IN ('HELD', 'RELEASED', 'REFUNDED')),
  held_at       TIMESTAMPTZ DEFAULT now(),
  released_at   TIMESTAMPTZ,
  refunded_at   TIMESTAMPTZ
);

-- ── 3. Add milestone_id to disputes ─────────────────────────

ALTER TABLE disputes
  ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES milestones(id);

-- ── 4. Indexes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_escrow_milestone        ON escrow_transactions(milestone_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status           ON escrow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_milestone_review_deadline ON milestones(review_deadline);
CREATE INDEX IF NOT EXISTS idx_milestone_status        ON milestones(status);  -- already exists but safe

-- ── 5. Atomic RPC: fund_milestone_atomic ─────────────────────
--   Called by backend when client funds a milestone.
--   Atomically:
--     - deducts client wallet balance
--     - adds to client escrow_balance
--     - inserts escrow_transactions row (HELD)
--     - sets milestone status = 'funded'

CREATE OR REPLACE FUNCTION fund_milestone_atomic(p_milestone UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount          NUMERIC;
  v_client          UUID;
  v_freelancer      UUID;
  v_client_balance  NUMERIC;
  v_milestone_status TEXT;
BEGIN
  -- Lock milestone row and get details
  SELECT m.amount, m.status, p.client_id, p.freelancer_id
  INTO   v_amount, v_milestone_status, v_client, v_freelancer
  FROM   milestones m
  JOIN   projects   p ON p.id = m.project_id
  WHERE  m.id = p_milestone
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone not found';
  END IF;

  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'Milestone amount must be set before funding';
  END IF;

  IF v_milestone_status <> 'pending' THEN
    RAISE EXCEPTION 'Milestone is already funded or in progress';
  END IF;

  -- Lock client wallet and check balance
  SELECT balance INTO v_client_balance
  FROM   wallets
  WHERE  user_id = v_client
  FOR UPDATE;

  IF v_client_balance IS NULL THEN
    RAISE EXCEPTION 'Client wallet not found';
  END IF;

  IF v_client_balance < v_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- Move balance → escrow_balance
  UPDATE wallets
  SET
    balance        = balance        - v_amount,
    escrow_balance = escrow_balance + v_amount,
    updated_at     = now()
  WHERE user_id = v_client;

  -- Create escrow record
  INSERT INTO escrow_transactions (milestone_id, payer_id, payee_id, amount, status)
  VALUES (p_milestone, v_client, v_freelancer, v_amount, 'HELD');

  -- Advance milestone status
  UPDATE milestones
  SET status = 'funded', updated_at = now()
  WHERE id = p_milestone;
END;
$$;

-- ── 6. Atomic RPC: release_escrow_atomic ─────────────────────
--   Called by backend when client approves a milestone.
--   Atomically:
--     - deducts client escrow_balance
--     - credits freelancer balance
--     - marks escrow_transactions row as RELEASED
--     - sets milestone status = 'released' + approved_at

CREATE OR REPLACE FUNCTION release_escrow_atomic(p_milestone UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount     NUMERIC;
  v_client     UUID;
  v_freelancer UUID;
BEGIN
  -- Lock escrow row (prevents double release)
  SELECT amount, payer_id, payee_id
  INTO   v_amount, v_client, v_freelancer
  FROM   escrow_transactions
  WHERE  milestone_id = p_milestone
  AND    status = 'HELD'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No held escrow found for this milestone — already released or not funded';
  END IF;

  -- Client escrow ↓
  UPDATE wallets
  SET escrow_balance = escrow_balance - v_amount,
      updated_at     = now()
  WHERE user_id = v_client;

  -- Freelancer balance ↑
  UPDATE wallets
  SET balance    = balance + v_amount,
      updated_at = now()
  WHERE user_id = v_freelancer;

  -- Mark escrow released
  UPDATE escrow_transactions
  SET status      = 'RELEASED',
      released_at = now()
  WHERE milestone_id = p_milestone
  AND   status = 'HELD';

  -- Advance milestone
  UPDATE milestones
  SET status      = 'released',
      approved_at = now(),
      updated_at  = now()
  WHERE id = p_milestone;
END;
$$;

-- ── 7. Auto-release query (for cron job — Phase 3) ────────────
-- Run every hour to auto-release expired reviews.
-- Example query to feed into a cron:
--
--   SELECT id FROM milestones
--   WHERE  status = 'in_review'
--   AND    review_deadline < now()
--   AND    id NOT IN (
--            SELECT milestone_id FROM disputes
--            WHERE  resolved_at IS NULL
--              AND  milestone_id IS NOT NULL
--          );
--
-- Then call: SELECT release_escrow_atomic(id) for each row.
