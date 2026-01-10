-- SQL Script for User Profiles Table
-- Run this in Supabase SQL Editor
-- 
-- NOTE: Profile data is now stored in a separate user_profiles table
-- instead of columns in the users table. This provides better separation
-- and allows for easier profile management.

-- ============================================================
-- MIGRATION SCRIPT (If you need to remove old columns)
-- ============================================================
-- If you previously had profile columns in users table, run this first:
/*
ALTER TABLE users 
DROP COLUMN IF EXISTS title,
DROP COLUMN IF EXISTS bio,
DROP COLUMN IF EXISTS skills,
DROP COLUMN IF EXISTS hourly_rate,
DROP COLUMN IF EXISTS location,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS languages,
DROP COLUMN IF EXISTS education,
DROP COLUMN IF EXISTS experience,
DROP COLUMN IF EXISTS certifications,
DROP COLUMN IF EXISTS portfolio,
DROP COLUMN IF EXISTS profile_image,
DROP COLUMN IF EXISTS availability;
*/

-- ============================================================
-- CREATE USER_PROFILES TABLE
-- ============================================================
-- Create user_profiles table (if not already created)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  bio VARCHAR(255),
  rating INTEGER DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  projects_completed INTEGER DEFAULT 0,
  about TEXT,
  skills TEXT[],
  profile_image TEXT,
  phone TEXT,
  certifications TEXT,
  education TEXT,
  languages TEXT[],
  hourly_rate TEXT,
  portfolio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_user_profile 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE
);

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'User profile information linked to users table';
COMMENT ON COLUMN user_profiles.user_id IS 'Foreign key reference to users.id';
COMMENT ON COLUMN user_profiles.bio IS 'Short bio/headline';
COMMENT ON COLUMN user_profiles.rating IS 'Average rating (0-5)';
COMMENT ON COLUMN user_profiles.reviews_count IS 'Total number of reviews';
COMMENT ON COLUMN user_profiles.projects_completed IS 'Number of completed projects';
COMMENT ON COLUMN user_profiles.about IS 'Detailed about section';
COMMENT ON COLUMN user_profiles.skills IS 'Array of skills';
COMMENT ON COLUMN user_profiles.languages IS 'Array of languages';
COMMENT ON COLUMN user_profiles.hourly_rate IS 'Hourly rate as text';
COMMENT ON COLUMN user_profiles.profile_image IS 'Profile photo URL';
COMMENT ON COLUMN user_profiles.phone IS 'Contact phone number';
COMMENT ON COLUMN user_profiles.certifications IS 'Certifications information';
COMMENT ON COLUMN user_profiles.education IS 'Education information';
COMMENT ON COLUMN user_profiles.portfolio IS 'Portfolio information';

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Create updated_at trigger function (auto-updates timestamp)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DATA STRUCTURE EXAMPLES (for reference)
-- ============================================================
-- 
-- skills: ["React", "Node.js", "TypeScript", "UI/UX Design"]
-- 
-- languages: ["English", "Spanish", "Urdu"]
-- 
-- Example INSERT:
-- INSERT INTO user_profiles (user_id, bio, skills, hourly_rate, phone, languages)
-- VALUES (
--   'user-uuid-here',
--   'Full Stack Developer',
--   ARRAY['React', 'Node.js', 'TypeScript'],
--   '50',
--   '+1234567890',
--   ARRAY['English', 'Urdu']
-- );
--
-- Example UPDATE:
-- UPDATE user_profiles
-- SET bio = 'Updated bio',
--     skills = ARRAY['React', 'Vue.js', 'Angular'],
--     hourly_rate = '75'
-- WHERE user_id = 'user-uuid-here';
