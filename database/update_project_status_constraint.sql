-- Drop the existing status check constraint on the projects table
-- and replace it with one that includes IN_PROGRESS.
--
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query).

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
