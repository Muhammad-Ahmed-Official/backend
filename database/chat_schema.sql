-- Chat table for real-time messaging between users (and optionally scoped to a project)
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor -> New query)

-- Ensure uuid extension exists (Supabase usually has it)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Foreign key names expected by the backend (for joins)
-- If your FKs get different auto-names, add these explicitly:
-- ALTER TABLE chats ADD CONSTRAINT chats_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id);
-- ALTER TABLE chats ADD CONSTRAINT chats_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES users(id);
-- ALTER TABLE chats ADD CONSTRAINT chats_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_chats_sender_id ON chats(sender_id);
CREATE INDEX IF NOT EXISTS idx_chats_receiver_id ON chats(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chats_project_id ON chats(project_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at DESC);

-- Optional: auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chats_updated_at ON chats;
CREATE TRIGGER chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
