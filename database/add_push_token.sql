-- Add push_token column to users table for FCM push notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT DEFAULT NULL;
