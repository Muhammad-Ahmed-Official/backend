-- Add GitHub URL field to milestones for freelancer submission
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS submission_github_url TEXT;
