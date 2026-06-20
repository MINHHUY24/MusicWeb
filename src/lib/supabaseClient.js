import { createClient } from '@supabase/supabase-js'

let supabaseClientPromise = null

async function readAuthConfig() {
  const response = await fetch('/api/auth/config')
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || 'Missing Supabase auth config.')
  }

  return payload
}

export async function getSupabaseClient() {
  if (!supabaseClientPromise) {
    supabaseClientPromise = readAuthConfig().then(({ supabaseUrl, supabaseAnonKey }) =>
      createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      }),
    )
  }

  return supabaseClientPromise
}

export function getUserDisplayName(user) {
  return (
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'MusicWeb user'
  )
}

export function getUserAvatar(user) {
  return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
}
