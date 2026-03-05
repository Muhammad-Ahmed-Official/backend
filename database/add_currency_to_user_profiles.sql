-- Add optional currency column to user_profiles (for freelancer hourly rate).
-- Run this in Supabase SQL Editor if your user_profiles table doesn't have currency yet.
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';

COMMENT ON COLUMN user_profiles.currency IS 'ISO 4217 currency code for hourly rate (e.g. USD, PKR). Default USD.';
