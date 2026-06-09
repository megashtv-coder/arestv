import { createClient } from '@supabase/supabase-js'

// Supabase credentials (hardcoded — public anon key is safe)
const url = 'https://zssasbllfjeaailfteep.supabase.co'
const key = 'sb_publishable_RmkUSCdjd71U6_gYlkb7Nw_Of8u4QLx'

// Create Supabase client with custom auth token from localStorage
// This token will be used by RLS policies to check org_id
const getAuthToken = () => {
  return localStorage.getItem('xflow_auth_token') || ''
}

// Custom headers that include our JWT token
const getHeaders = () => {
  const token = getAuthToken()
  return {
    Authorization: token ? `Bearer ${token}` : '',
    'X-Organization-Token': token
  }
}

// Initialize Supabase client
export const supabase = createClient(url, key, {
  headers: getHeaders()
})

// Helper function to update headers when token changes (on login/logout)
export const updateSupabaseHeaders = () => {
  const token = getAuthToken()
  if (supabase && supabase.client) {
    supabase.client.headers = getHeaders()
  }
}
