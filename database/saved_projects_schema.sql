-- ============================================================
-- Saved projects (bookmarks) - user saves a project for later
-- Run in Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS saved_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_projects_user_id ON saved_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_projects_project_id ON saved_projects(project_id);
