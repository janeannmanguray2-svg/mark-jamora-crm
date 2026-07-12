import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// supabase-js is loaded globally via the CDN <script> tag in index.html
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});
