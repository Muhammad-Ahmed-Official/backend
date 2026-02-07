/**
 * Quick check: chats table exists and is usable (Supabase).
 * Run from backend folder: node tests/test-chat-db.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

async function main() {
  const { supabase } = await import('../src/config/supabase.js');

  console.log('Chat DB check\n');

  // 1. Chats table exists and has expected columns
  console.log('1. Checking chats table...');
  const { data: rows, error: selectError } = await supabase
    .from('chats')
    .select('id, sender_id, receiver_id, message, project_id, read, created_at, updated_at')
    .limit(1);

  if (selectError) {
    if (selectError.code === '42P01' || selectError.message?.includes('does not exist')) {
      console.log('   FAIL: Table "chats" does not exist. Run backend/database/chat_schema.sql in Supabase SQL Editor.\n');
      process.exit(1);
    }
    console.log('   FAIL:', selectError.message);
    process.exit(1);
  }
  console.log('   OK: chats table exists and is readable.\n');

  // 2. Optional: count rows
  const { count, error: countError } = await supabase
    .from('chats')
    .select('*', { count: 'exact', head: true });
  if (!countError) {
    console.log('2. Row count:', count ?? 0, '\n');
  }

  console.log('Chat DB check passed. You can use the chat API and Socket.io.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
