import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && key && !url.includes('YOUR_PROJECT'));
export const supabase = isSupabaseConfigured ? createClient(url, key) : null;

export function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured. Copy .env.example to .env.local and add your project URL and publishable key.');
  return supabase;
}
