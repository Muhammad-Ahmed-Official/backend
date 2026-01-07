-- SQL Script to add profile columns to f_users table
-- Run this in Supabase SQL Editor

-- Add profile fields to f_users table
ALTER TABLE f_users 
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS experience JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS portfolio JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS profile_image VARCHAR(500),
ADD COLUMN IF NOT EXISTS availability VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN f_users.title IS 'Professional headline/title';
COMMENT ON COLUMN f_users.bio IS 'About/description of the user';
COMMENT ON COLUMN f_users.skills IS 'Array of skills as JSON';
COMMENT ON COLUMN f_users.hourly_rate IS 'Hourly rate in USD';
COMMENT ON COLUMN f_users.location IS 'City, Country';
COMMENT ON COLUMN f_users.phone IS 'Contact phone number';
COMMENT ON COLUMN f_users.languages IS 'Languages with proficiency: [{name, proficiency}]';
COMMENT ON COLUMN f_users.education IS 'Education entries: [{degree, school, years, description}]';
COMMENT ON COLUMN f_users.experience IS 'Work experience: [{company, position, duration, description}]';
COMMENT ON COLUMN f_users.certifications IS 'Certifications: [{name, issuer, date, credential}]';
COMMENT ON COLUMN f_users.portfolio IS 'Portfolio items: [{title, description, images, link}]';
COMMENT ON COLUMN f_users.profile_image IS 'Profile photo URL';
COMMENT ON COLUMN f_users.availability IS 'Available hours per week';

-- Example data structures (for reference):
-- languages: [{"name": "English", "proficiency": "Native"}, {"name": "Spanish", "proficiency": "Fluent"}]
-- education: [{"degree": "Bachelor of Science", "school": "University Name", "years": "2015-2019", "description": "Computer Science"}]
-- experience: [{"company": "Tech Corp", "position": "Developer", "duration": "2019-2023", "description": "Built web applications"}]
-- certifications: [{"name": "AWS Certified", "issuer": "Amazon", "date": "2023", "credential": "ABC123"}]
-- portfolio: [{"title": "E-commerce App", "description": "Mobile shopping app", "images": ["url1", "url2"], "link": "https://..."}]
-- skills: ["React", "Node.js", "TypeScript", "UI/UX Design"]

