// Import Supabase Javascript Library (SDK)
import { createClient } from '@supabase/supabase-js';

// Project-Specific Configurations
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL as string;
const supabaseKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY as string;

// Create and Export Supabase Client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});