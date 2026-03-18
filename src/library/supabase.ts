// Import Supabase JavaScript Library (SDK)
import { createClient } from '@supabase/supabase-js';

// Project-Specific Configurations
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create and Export Supabase Client into UI
export const supabase = createClient(supabaseUrl, supabaseAnonKey);