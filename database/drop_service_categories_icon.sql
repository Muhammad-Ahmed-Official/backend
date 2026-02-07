-- Remove icon column from service_categories (Lucide icon feature removed)
-- Run this in Supabase SQL Editor if your table has an icon column.

ALTER TABLE service_categories
DROP COLUMN IF EXISTS icon;
