-- Migration: Add seen_at column to chats table for read receipts
-- Run this ONCE in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Add the seen_at column
ALTER TABLE chats ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create an RPC function so backend can run this migration automatically in future
CREATE OR REPLACE FUNCTION add_seen_at_column()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'seen_at'
  ) THEN
    ALTER TABLE chats ADD COLUMN seen_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
