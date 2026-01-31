import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)');
}

// Use service role key when set so backend can perform insert/update/delete on tables
// with RLS that only allows "authenticated" (e.g. service_categories). Otherwise use anon key.
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;
export const supabase = createClient(supabaseUrl, supabaseKey);