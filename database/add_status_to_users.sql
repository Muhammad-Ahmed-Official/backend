-- Add status column to users table for suspend/reactivate (admin)
-- Run in Supabase SQL Editor if the column does not exist.
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
COMMENT ON COLUMN users.status IS 'User account status: active | suspended';
