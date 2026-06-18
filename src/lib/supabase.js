import { createClient } from '@supabase/supabase-js'

// Supabase credentials (hardcoded — public anon key is safe)
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Initialize Supabase client
// Supabase handles sessions automatically with auth.signInWithPassword()
export const supabase = createClient(url, key)
