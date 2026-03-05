-- Add optional currency column to projects (for budget display).
-- Run this in Supabase SQL Editor if your projects table doesn't have currency yet.
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

COMMENT ON COLUMN projects.currency IS 'ISO 4217 currency code (e.g. USD, PKR). Default USD.';
