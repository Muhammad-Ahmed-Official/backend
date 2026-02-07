-- Run this in Supabase Dashboard → SQL Editor to fix "Proposal not found" on Accept/Reject.
-- Your backend already enforces that only the project owner can update (controller check).
-- This allows the backend's service role to update rows; RLS was blocking the update.

ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;

-- Optional: To re-enable RLS later and allow all operations for authenticated service (e.g. backend):
-- ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
-- Then add a policy that allows UPDATE for the role your backend uses, or leave disabled.
