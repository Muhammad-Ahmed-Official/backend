import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from backend root so service role key is available (needed for proposal updates)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)');
}

// Use service role key when set so backend can perform insert/update/delete on tables with RLS
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;
const usingServiceRole = Boolean(supabaseServiceRoleKey);
if (!usingServiceRole) {
  console.warn('[Supabase] SUPABASE_SERVICE_ROLE_KEY not set - using anon key. RLS will apply; proposal Accept/Reject may fail.');
} else {
  console.log('[Supabase] Using service role key (RLS bypassed for backend operations).');
}
export const supabase = createClient(supabaseUrl, supabaseKey);

/** Use for updates that must bypass RLS (e.g. proposal status). Created with key from env at call time. */
export function getSupabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return createClient(supabaseUrl, key);
}